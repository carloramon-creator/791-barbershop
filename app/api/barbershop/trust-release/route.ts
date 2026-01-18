
import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const { tenant, user, role } = await getCurrentUserAndTenant();

        if (!tenant || !user || role !== 'owner') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // 1. Verificar regra de uso (Max 1 vez a cada 30 dias)
        const lastRelease = tenant.settings?.last_trust_release_at;
        if (lastRelease) {
            const lastDate = new Date(lastRelease);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 30) {
                return NextResponse.json({
                    error: `A liberação de confiança só pode ser usada uma vez a cada 30 dias. Disponível novamente em ${30 - diffDays} dias.`
                }, { status: 400 });
            }
        }

        // 2. Calcular nova data de liberação (+3 dias)
        const now = new Date();
        const trustUntil = new Date(now);
        trustUntil.setDate(trustUntil.getDate() + 3);

        const newSettings = {
            ...tenant.settings,
            last_trust_release_at: now.toISOString(),
            trust_release_until: trustUntil.toISOString()
        };

        // 3. Salvar no Banco
        const { error } = await supabaseAdmin
            .from('tenants')
            .update({ settings: newSettings })
            .eq('id', tenant.id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Acesso liberado por 3 dias! Regularize sua situação financeira para evitar novo bloqueio.',
            valid_until: trustUntil.toISOString()
        });

    } catch (error: any) {
        console.error('[TRUST RELEASE ERROR]', error);
        return NextResponse.json({ error: 'Erro ao processar liberação.' }, { status: 500 });
    }
}
