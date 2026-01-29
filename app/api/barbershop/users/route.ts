import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant, checkRolePermission } from '@/lib/server-utils';

// Função auxiliar para garantir o URL correto de redirecionamento
const getRedirectUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://791barber.com';
  // Redirecionar para ativar-conta para o usuário definir sua senha
  return `${baseUrl}/ativar-conta`;
};

export async function GET(req: Request) {
  try {
    const { tenant, role } = await getCurrentUserAndTenant();
    checkRolePermission(role, 'manage_users');
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('include_archived') === 'true';

    let query = getSupabaseAdmin()
      .from('users')
      .select(`
        *,
        barber:barbers(*)
      `)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_active', true);
    }

    const { data: users, error } = await query;
    if (error) throw error;
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenant, roles: currentUserRoles } = await getCurrentUserAndTenant();
    checkRolePermission(currentUserRoles, 'manage_users');
    const body = await req.json();
    const { userId: existingUserId, email, name, nickname, role: requestRole, roles: requestRoles, generateInvite = false, photo_url } = body;

    let targetEmail = email?.toLowerCase();
    let userId = existingUserId;

    // Determinar roles finais (preferência pelo array roles, fallback para role)
    const finalRoles = requestRoles || (requestRole ? [requestRole] : ['staff']);
    const primaryRole = finalRoles[0] || 'staff';

    if (userId && generateInvite) {
      const { data: u } = await getSupabaseAdmin().from('users').select('email').eq('id', userId).single();
      if (u) targetEmail = u.email;
    }

    if (!userId && targetEmail) {
      const { data: created, error: createError } = await getSupabaseAdmin().auth.admin.createUser({
        email: targetEmail,
        email_confirm: true,
        user_metadata: { name }
      });

      if (createError) {
        if (createError.message.includes('already been registered')) {
          const { data: { users: authUsers } } = await getSupabaseAdmin().auth.admin.listUsers();
          const found = authUsers?.find(u => u.email?.toLowerCase() === targetEmail);
          userId = found?.id;
        } else {
          throw createError;
        }
      } else {
        userId = created.user?.id;
      }
    }

    if (!userId) throw new Error('Não foi possível identificar o usuário');

    let finalUserRecord = null;
    if (!(existingUserId && generateInvite)) {
      const userPayload: any = {
        id: userId,
        tenant_id: tenant.id,
        email: targetEmail,
        name: name || targetEmail.split('@')[0],
        nickname,
        role: primaryRole,
        roles: finalRoles,
        photo_url,
        phone: body.phone,
        cpf: body.cpf,
        cep: body.cep,
        street: body.street,
        number: body.number,
        complement: body.complement || '',
        neighborhood: body.neighborhood,
        city: body.city,
        state: body.state,
        avg_service_time: body.avg_service_time || 30,
        commission_type: body.commission_type || 'percentage',
        commission_value: body.commission_value || 50,
        birth_date: body.birth_date
      };

      Object.keys(userPayload).forEach(key => userPayload[key] === undefined && delete userPayload[key]);
      const { data: upserted, error: upsertError } = await getSupabaseAdmin().from('users').upsert(userPayload).select().single();

      if (upsertError) throw upsertError;
      finalUserRecord = upserted;

      // Sincronizar com a tabela de barbeiros se a role barber estiver presente
      if (finalRoles.includes('barber')) {
        console.log('[SYNC_BARBER_POST] Sincronizando barbeiro para user:', userId);
        const { data: barberData, error: barberError } = await getSupabaseAdmin().from('barbers').upsert({
          tenant_id: tenant.id,
          user_id: userId,
          name: name || targetEmail.split('@')[0],
          nickname,
          photo_url: photo_url,
          avg_time_minutes: body.avg_service_time || 30,
          commission_percentage: body.commission_type === 'percentage' ? body.commission_value : 0,
          is_active: true
        }, { onConflict: 'tenant_id,user_id' }).select().single();

        if (barberError) {
          console.error('[SYNC_BARBER_POST_ERROR]', barberError);
        }

        if (barberData) {
          console.log('[SYNC_BARBER_POST_SUCCESS] Barber ID:', barberData.id);
          (finalUserRecord as any).barber = barberData;
        } else {
          console.warn('[SYNC_BARBER_POST_WARNING] No barber data returned');
        }
      }
    } else {
      const { data: existing } = await getSupabaseAdmin().from('users').select('*').eq('id', userId).single();
      finalUserRecord = existing;
    }

    let inviteLink = null;
    if (generateInvite && targetEmail) {
      const redirectTo = getRedirectUrl();

      const { data: linkData, error: linkErr } = await getSupabaseAdmin().auth.admin.generateLink({
        type: 'invite',
        email: targetEmail,
        options: { redirectTo }
      });

      let rawLink = null;
      if (linkErr || !linkData.properties?.action_link) {
        // Fallback para recovery se invite falhar (usuário já existe?)
        const { data: recoveryData, error: recoveryErr } = await getSupabaseAdmin().auth.admin.generateLink({
          type: 'recovery',
          email: targetEmail,
          options: { redirectTo }
        });
        if (!recoveryErr) rawLink = recoveryData.properties?.action_link;
      } else {
        rawLink = linkData.properties?.action_link;
      }

      if (rawLink) {
        // Transformar link do Supabase em link amigável da aplicação
        try {
          const urlObj = new URL(rawLink);
          const token = urlObj.searchParams.get('token');
          const type = urlObj.searchParams.get('type') || 'invite';

          // USAR VARIÁVEL DE AMBIENTE OU FALLBACK SEGURO
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://791barber.com';
          // Transformar em link da nossa aplicação
          inviteLink = `${baseUrl}/ativar-conta?token=${token}&type=${type}`;
        } catch (e) {
          inviteLink = rawLink;
        }
      }
    }

    if (generateInvite && !inviteLink) {
      throw new Error('O sistema de login não permitiu gerar um link para este e-mail.');
    }

    return NextResponse.json({ ...finalUserRecord, inviteLink });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const { tenant, roles: currentUserRoles } = await getCurrentUserAndTenant();
    checkRolePermission(currentUserRoles, 'manage_users');
    const body = await req.json();

    const finalRoles = body.roles || (body.role ? [body.role] : undefined);
    const primaryRole = finalRoles ? finalRoles[0] : undefined;

    const updates: any = {
      name: body.name,
      nickname: body.nickname,
      role: primaryRole,
      roles: finalRoles,
      photo_url: body.photo_url,
      phone: body.phone,
      cpf: body.cpf,
      cep: body.cep,
      street: body.street,
      number: body.number,
      complement: body.complement || '',
      neighborhood: body.neighborhood,
      city: body.city,
      state: body.state,
      avg_service_time: body.avg_service_time,
      commission_type: body.commission_type,
      commission_value: body.commission_value,
      birth_date: body.birth_date
    };

    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
    const { data, error } = await getSupabaseAdmin().from('users').update(updates).eq('id', body.id).select().single();

    if (error) throw error;

    // Sincronizar com a tabela de barbeiros
    const currentRoles = data.roles || [];
    if (currentRoles.includes('barber')) {
      console.log('[SYNC_BARBER_PUT] Sincronizando barbeiro para user:', body.id);
      const { data: barberData, error: barberError } = await getSupabaseAdmin().from('barbers').upsert({
        tenant_id: tenant.id,
        user_id: body.id,
        name: data.name,
        nickname: data.nickname,
        photo_url: data.photo_url,
        avg_time_minutes: data.avg_service_time || 30,
        commission_percentage: data.commission_type === 'percentage' ? data.commission_value : 0,
        is_active: true
      }, { onConflict: 'tenant_id,user_id' }).select().single();

      if (barberError) {
        console.error('[SYNC_BARBER_PUT_ERROR]', barberError);
      }

      if (barberData) {
        console.log('[SYNC_BARBER_PUT_SUCCESS] Barber ID:', barberData.id);
        (data as any).barber = barberData;
      } else {
        console.warn('[SYNC_BARBER_PUT_WARNING] No barber data returned');
      }
    } else {
      // Se não for mais barbeiro, desativar na tabela de barbeiros
      await getSupabaseAdmin().from('barbers').update({ is_active: false }).eq('tenant_id', tenant.id).eq('user_id', body.id);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { tenant, role } = await getCurrentUserAndTenant();
    checkRolePermission(role, 'manage_users');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    // Se for exclusão permanente
    if (permanent) {
      // Desativar barbeiro associado antes de deletar o usuário
      await getSupabaseAdmin()
        .from('barbers')
        .update({ is_active: false })
        .eq('user_id', id)
        .eq('tenant_id', tenant.id);

      const { error } = await getSupabaseAdmin().from('users').delete().eq('id', id).eq('tenant_id', tenant.id);
      if (error) throw error;
    } else {
      // Soft delete (Arquivar)
      // Desativar barbeiro associado
      await getSupabaseAdmin()
        .from('barbers')
        .update({ is_active: false })
        .eq('user_id', id)
        .eq('tenant_id', tenant.id);

      const { error } = await getSupabaseAdmin().from('users').update({ is_active: false }).eq('id', id).eq('tenant_id', tenant.id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
