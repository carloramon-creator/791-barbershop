import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function POST(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        if (!tenant || !user) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Não autenticado' }, { status: 401 }));
        }

        const { plan_slug, addons = [], billing_cycle = 1 } = await req.json();

        if (!plan_slug) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Plano obrigatório' }, { status: 400 }));
        }

        // Verificar se já existe assinatura ativa
        const { data: existingSubscription } = await getSupabaseAdmin()
            .from('subscriptions')
            .select('*')
            .eq('tenant_id', tenant.id)
            .in('status', ['active', 'pending'])
            .single();

        if (existingSubscription) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'Já existe uma assinatura ativa',
                subscription: existingSubscription
            }, { status: 400 }));
        }

        // Calcular próxima data de cobrança (30 dias após hoje)
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        // Criar assinatura
        const { data: subscription, error } = await getSupabaseAdmin()
            .from('subscriptions')
            .insert({
                tenant_id: tenant.id,
                plan_slug,
                addons,
                billing_cycle,
                status: 'active', // Ativa imediatamente após primeiro pagamento
                next_billing_date: nextBillingDate.toISOString().split('T')[0],
                last_billing_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

        if (error) {
            console.error('[SUBSCRIPTION CREATE] Erro ao criar assinatura:', error);
            return addCorsHeaders(req, NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 }));
        }

        console.log(`[SUBSCRIPTION CREATE] Assinatura criada para ${tenant.name}:`, subscription.id);

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            subscription
        }));

    } catch (e: any) {
        console.error('[SUBSCRIPTION CREATE] Erro:', e);
        return addCorsHeaders(req, NextResponse.json({ error: e.message }, { status: 500 }));
    }
}
