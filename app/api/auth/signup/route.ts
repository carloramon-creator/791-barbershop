import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders } from '@/lib/server-utils';
import { DEFAULT_CATEGORIES } from '@/lib/default-data';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password, barbershopName, phone, cnpj, businessType, services, products, module_queue_enabled, module_appointments_enabled } = body;

        console.log('[API SIGNUP] Email:', email, 'Barbershop:', barbershopName, 'Type:', businessType);

        if (!name || !email || !password || !barbershopName) {
            const response = NextResponse.json(
                { error: 'Nome, e-mail, senha e barbearia são obrigatórios' },
                { status: 400 }
            );
            return addCorsHeaders(req, response);
        }

        // 1. Criar usuário no Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
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
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://791barber.com';
        const redirectUrl = `${baseUrl}/auth/callback`;
        console.log('[API SIGNUP] Redirect URL:', redirectUrl);

        await supabaseAdmin.auth.resend({
            type: 'signup',
            email: email,
            options: {
                emailRedirectTo: redirectUrl
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
        const { data: currentPlans } = await supabaseAdmin.from('system_plans').select('*');
        const { data: currentAddons } = await supabaseAdmin.from('system_addons').select('*');
        const contractSnapshot = {
            plans: currentPlans || [],
            addons: currentAddons || [],
            accepted_at: new Date().toISOString(),
            accepted_by: name,
            ip: req.headers.get('x-forwarded-for') || '0.0.0.0'
        };

        // 3. Criar tenant (Barbearia) com plano PREMIUM e período de trial
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .insert({
                name: barbershopName,
                slug,
                phone: phone || null,
                cnpj: cnpj || null,
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
            await supabaseAdmin.auth.admin.deleteUser(userId);
            throw tenantError;
        }
        console.log('[API SIGNUP] Tenant criado:', tenant.id);

        // 4. Criar usuário em public.users vinculado ao tenant (Owner + Barber)
        const { error: userError } = await supabaseAdmin
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
            await supabaseAdmin.auth.admin.deleteUser(userId);
            await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
            throw userError;
        }

        // 4.1 Criar registro na tabela barbers (Perfil do Barbeiro)
        const { error: barberError } = await supabaseAdmin
            .from('barbers')
            .insert({
                user_id: userId,
                tenant_id: tenant.id,
                name,
                is_active: true,
                status: 'available'
            });

        if (barberError) {
            console.error('[API SIGNUP] Barber insertion error:', barberError);
            // We continue as it's not fatal for the account, but logged
        }

        // 5. Criar trial subscription (10 dias)
        const { error: trialError } = await supabaseAdmin
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
            const { error: servicesError } = await supabaseAdmin.from('services').insert(
                services.map((s: any) => ({
                    tenant_id: tenant.id,
                    name: s.name,
                    price: parseFloat(s.price) || 0,
                    duration_minutes: parseInt(s.duration_minutes) || 0,
                }))
            );

            if (servicesError) {
                console.error('[API SIGNUP] Services error:', servicesError);
                // Continue anyway (non-critical)
            } else {
                console.log('[API SIGNUP] Services criados:', services.length);
            }
        }

        // 7. Insert product categories
        const { data: categories, error: categoriesError } = await supabaseAdmin
            .from('product_categories')
            .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, tenant_id: tenant.id })))
            .select();

        if (categoriesError) {
            console.error('[API SIGNUP] Categories error:', categoriesError);
            // Continue anyway
        } else {
            console.log('[API SIGNUP] Categories criadas:', categories?.length);
        }

        // 8. Insert products (if any)
        if (products && products.length > 0) {
            // Re-fetch categories to ensure we have the IDs even if the insert return was flaky
            const { data: finalCategories } = await supabaseAdmin
                .from('product_categories')
                .select('id, name')
                .eq('tenant_id', tenant.id);

            if (finalCategories && finalCategories.length > 0) {
                const productsWithCategories = products.map((p: any) => {
                    const category = finalCategories.find((c: any) => c.name === p.category);
                    return {
                        tenant_id: tenant.id,
                        name: p.name,
                        price: parseFloat(p.price) || 0,
                        category_id: category?.id || null,
                    };
                });

                const { error: productsError } = await supabaseAdmin
                    .from('products')
                    .insert(productsWithCategories);

                if (productsError) {
                    console.error('[API SIGNUP] Products error:', productsError);
                } else {
                    console.log('[API SIGNUP] Products criados:', products.length);
                }
            } else {
                console.warn('[API SIGNUP] No categories found for product mapping');
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
