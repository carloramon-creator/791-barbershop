import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Informe ?email=SEU_EMAIL' }, { status: 400 });
        }

        // 1. Buscar Auth User
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        const authUser = users.find(u => u.email === email);

        if (!authUser) {
            return NextResponse.json({ error: 'Usuário não encontrado no Auth (Login).' }, { status: 404 });
        }

        // 2. Buscar Profile na tabela public.users
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

        let status = 'OK';
        let actions = [];

        // 3. Se não existir perfil, criar/corrigir
        if (profileError || !profile) {
            status = 'FIXING_PROFILE';
            // Tenta achar ou criar um tenant padrão
            const { data: tenant } = await supabaseAdmin.from('tenants').select('id').limit(1).single();

            const newProfile = {
                id: authUser.id,
                email: email,
                name: 'Admin Recuperado',
                role: 'owner',
                is_system_admin: true,
                tenant_id: tenant?.id
            };

            const { error: createError } = await supabaseAdmin.from('users').upsert(newProfile);
            if (createError) throw createError;
            actions.push('Perfil recriado na tabela users');
        } else {
            // Se existir, garantir que é admin
            if (!profile.is_system_admin) {
                await supabaseAdmin.from('users').update({ is_system_admin: true }).eq('id', authUser.id);
                actions.push('Promovido para System Admin');
            }
        }

        return NextResponse.json({
            message: 'Diagnóstico concluído',
            auth_id: authUser.id,
            profile_found: !!profile,
            actions_taken: actions,
            current_data: profile
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}
