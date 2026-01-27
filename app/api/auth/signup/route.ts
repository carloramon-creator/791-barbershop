import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders } from '@/lib/server-utils';
import { DEFAULT_CATEGORIES } from '@/lib/default-data';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            name, email, password, barbershopName, phone, cnpj, businessType,
            services, products, module_queue_enabled, module_appointments_enabled,
            // Address fields
            cep, street, number, neighborhood, city, state, complement,
            // Redirect Override
            emailRedirectTo
        } = body;

        console.log('[API SIGNUP] Email:', email, 'Barbershop:', barbershopName, 'Type:', businessType);

        if (!name || !email || !password || !barbershopName) {
            const response = NextResponse.json(
                { error: 'Nome, e-mail, senha e barbearia são obrigatórios' },
                { status: 400 }
            );
            return addCorsHeaders(req, response);
        }

        // 1. Criar usuário no Auth
        const { data: authUser, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: false,
            user_metadata: { name }
        });

        if (authError) {
            console.error('[API SIGNUP] Auth error:', authError.message);
            const response = NextResponse.json(
                { error: 'E-mail já cadastrado (Auth)' },
                { status: 400 }
            );
            return addCorsHeaders(req, response);
        }

        // Enviar email de confirmação
        // PRIORIDADE ABSOLUTA: Usar o link que veio do frontend (emailRedirectTo) ou hardcoded
        // Ignorar env vars do servidor que podem estar como localhost
        const baseUrl = 'https://791barber.com';
        const finalRedirectUrl = emailRedirectTo || `${baseUrl}/auth/callback`;

        console.log('[API SIGNUP] Final Redirect URL:', finalRedirectUrl);

        await getSupabaseAdmin().auth.resend({
            type: 'signup',
            email: email,
            options: {
                emailRedirectTo: finalRedirectUrl
            }
        });

        const userId = authUser.user.id;
        console.log('[API SIGNUP] Usuário criado:', userId);

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 10);

        // 2. Generate unique slug
        const baseSlug = barbershopName.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-'); // Remove duplicate hyphens

        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const slug = `${baseSlug}-${randomSuffix}`;

        // 2.5 Capture Contract Snapshot (Plans and Addons)
        const { data: currentPlans } = await getSupabaseAdmin().from('system_plans').select('*');
        const { data: currentAddons } = await getSupabaseAdmin().from('system_addons').select('*');
        const contractSnapshot = {
            plans: currentPlans || [],
            addons: currentAddons || [],
            accepted_at: new Date().toISOString(),
            accepted_by: name,
            ip: req.headers.get('x-forwarded-for') || '0.0.0.0'
        };

        // 3. Criar tenant (Barbearia) com plano PREMIUM, trial e ENDEREÇO
        const { data: tenant, error: tenantError } = await getSupabaseAdmin()
            .from('tenants')
            .insert({
                name: barbershopName,
                slug,
                phone: phone || null,
                cnpj: cnpj || null,
                // Endereço
                cep: cep || null,
                street: street || null,
                number: number || null,
                neighborhood: neighborhood || null,
                city: city || null,
                state: state || null,
                complement: complement || null,
                // --------------
                business_type: businessType || 'barbershop',
                plan: 'premium',
                subscription_status: 'trial',
                subscription_current_period_end: trialEndsAt.toISOString(),
                module_queue_enabled: module_queue_enabled !== undefined ? module_queue_enabled : true,
                module_appointments_enabled: module_appointments_enabled !== undefined ? module_appointments_enabled : true,
                terms_accepted_at: new Date().toISOString(),
                terms_version: '2026-01-18',
                contract_snapshot: contractSnapshot
            })
            .select()
            .single();

        if (tenantError) {
            console.error('[API SIGNUP] Tenant error:', tenantError);
            // Rollback: delete auth user
            await getSupabaseAdmin().auth.admin.deleteUser(userId);
            throw tenantError;
        }
        console.log('[API SIGNUP] Tenant criado:', tenant.id);

        // 4. Criar usuário em public.users vinculado ao tenant (Owner + Barber)
        const { error: userError } = await getSupabaseAdmin()
            .from('users')
            .insert({
                id: userId,
                name,
                email,
                tenant_id: tenant.id,
                role: 'owner',
                roles: ['owner', 'barber'], // Garantir array correto sem 'staff'
                is_barber: true, // Owner também é barbeiro por padrão
            });

        if (userError) {
            console.error('[API SIGNUP] Public User error:', userError);
            // Rollback
            await getSupabaseAdmin().auth.admin.deleteUser(userId);
            await getSupabaseAdmin().from('tenants').delete().eq('id', tenant.id);
            throw userError;
        }

        // 4.1 Criar registro na tabela barbers (Perfil do Barbeiro)
        const { data: barber, error: barberError } = await getSupabaseAdmin()
            .from('barbers')
            .insert({
                user_id: userId,
                tenant_id: tenant.id,
                name,
                is_active: true,
                status: 'available'
            })
            .select()
            .single();

        if (barberError) {
            console.error('[API SIGNUP] Barber insertion error:', barberError);
            // We continue as it's not fatal for the account, but logged
        }

        // 5. Criar trial subscription (10 dias)
        const { error: trialError } = await getSupabaseAdmin()
            .from('trial_subscriptions')
            .insert({
                user_id: userId,
                tenant_id: tenant.id,
                trial_ends_at: trialEndsAt.toISOString()
            });

        if (trialError) {
            console.error('[API SIGNUP] Trial error:', trialError);
            // Continue anyway (non-critical)
        }
        console.log('[API SIGNUP] Trial subscription criado');

        // 6. Insert services (if any)
        if (services && services.length > 0) {
            const { data: insertedServices, error: servicesError } = await getSupabaseAdmin().from('services').insert(
                services.map((s: any) => ({
                    tenant_id: tenant.id,
                    name: s.name,
                    price: parseFloat(s.price) || 0,
                    duration_minutes: parseInt(s.duration_minutes) || 0,
                }))
            ).select();

            if (servicesError) {
                console.error('[API SIGNUP] Services error:', servicesError);
                // Continue anyway (non-critical)
            } else {
                console.log('[API SIGNUP] Services criados:', services.length);

                // NOVO: Vincular todos os serviços ao barbeiro (dono) automaticamente
                if (barber && insertedServices && insertedServices.length > 0) {
                    const links = insertedServices.map(s => ({
                        barber_id: barber.id,
                        service_id: s.id
                    }));
                    await getSupabaseAdmin().from('barber_services').insert(links);
                    console.log('[API SIGNUP] Vínculo Barber-Services realizado');
                }
            }
        }

        // 7. Insert product categories
        const { data: categories, error: categoriesError } = await getSupabaseAdmin()
            .from('product_categories')
            .insert(DEFAULT_CATEGORIES.map(c => ({
                tenant_id: tenant.id,
                name: c.name
            })))
            .select();

        if (categoriesError) {
            console.error('[API SIGNUP] Categories error:', categoriesError);
            // Continue anyway
        } else {
            console.log('[API SIGNUP] Categories criadas:', categories?.length);
        }

        // 8. Insert products (if any)
        if (products && products.length > 0) {
            // Re-fetch categories to ensure we have the IDs
            const { data: finalCategories } = await getSupabaseAdmin()
                .from('product_categories')
                .select('id, name')
                .eq('tenant_id', tenant.id);

            const categoriesMap = (finalCategories || []).reduce((acc: any, cat: any) => {
                acc[cat.name] = cat.id;
                return acc;
            }, {});

            const productsWithCategories = products.map((p: any) => ({
                tenant_id: tenant.id,
                name: p.name,
                price: parseFloat(p.price) || 0,
                category_id: categoriesMap[p.category] || categoriesMap['Bebidas'] || null,
            }));

            const { error: productsError } = await getSupabaseAdmin()
                .from('products')
                .insert(productsWithCategories);

            if (productsError) {
                console.error('[API SIGNUP] Products error:', productsError);
            } else {
                console.log('[API SIGNUP] Products criados:', products.length);
            }
        }

        const response = NextResponse.json({
            success: true,
            userId,
            tenantId: tenant.id,
            message: 'Conta criada com sucesso!',
        }, { status: 201 });
        return addCorsHeaders(req, response);
    } catch (error: any) {
        console.error('[API SIGNUP] Erro:', error.message);
        const response = NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
        return addCorsHeaders(req, response);
    }
}
