import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
    try {
        const { data, error } = await getSupabaseAdmin()
            .from('system_coupons')
            .upsert({
                code: 'TESTE90',
                discount_percent: 90,
                is_active: true,
                max_uses: 99,
                name: 'Cupom de Teste 90%',
                created_at: new Date().toISOString()
            }, { onConflict: 'code' })
            .select();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Cupom TESTE90 (90%) criado com sucesso!',
            data
        });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
