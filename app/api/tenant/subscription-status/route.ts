import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * GET /api/tenant/subscription-status
 * Retorna o status atual da assinatura do tenant
 */
export async function GET() {
    try {
        const { tenant } = await getCurrentUserAndTenant();

        if (!tenant) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        return NextResponse.json({
            subscription_status: tenant.subscription_status,
            plan: tenant.plan,
            subscription_current_period_end: tenant.subscription_current_period_end
        });

    } catch (error: any) {
        console.error('[SUBSCRIPTION STATUS ERROR]', error);
        return NextResponse.json({
            error: error.message || 'Erro ao buscar status'
        }, { status: 500 });
    }
}
