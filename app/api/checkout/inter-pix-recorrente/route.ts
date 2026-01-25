import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3';

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

        const { plan: planSlug, coupon, interval = 1 } = await req.json();

        // 1. Processar Plano
        const { data: planData } = await getSupabaseAdmin()
            .from('system_plans')
            .select('*')
            .eq('slug', planSlug)
            .single();

        if (!planData) throw new Error('Plano inválido');

        let amount = Number(planData.price);
        // Descontos para Semestral/Anual não se aplicam bem a recorrência mensal automata? 
        // O Pix Automático do Inter é geralmente mensal.

        // 2. Configurações Inter
        const { data: settingsData } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const dbConfig = settingsData?.value;
        const clientId = dbConfig?.client_id || process.env.INTER_CLIENT_ID;
        const clientSecret = dbConfig?.client_secret || process.env.INTER_CLIENT_SECRET || '';
        const cert = (dbConfig?.crt || process.env.INTER_CERT_CONTENT || '').replace(/\\n/g, '\n');
        const key = (dbConfig?.key || process.env.INTER_KEY_CONTENT || '').replace(/\\n/g, '\n');

        if (!clientId || !cert || !key) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Configuração do Inter incompleta.' }, { status: 400 }));
        }

        const inter = new InterAPIV3({
            clientId,
            clientSecret,
            cert,
            key,
            accountNumber: dbConfig?.account_number || dbConfig?.accountNumber
        });

        // 3. Garantir documento
        let doc = (tenant.cnpj || tenant.cpf || tenant.document || '').replace(/\D/g, '');
        if (!doc) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Perfil incompleto: CPF/CNPJ necessário.' }, { status: 400 }));
        }

        console.log(`[INTER PIX AUTO] Iniciando recorrência para ${tenant.name}`);

        // A. Gerar Location
        const loc = await inter.createLocation('rec');
        const locId = loc.id;

        // B. Criar Acordo (Agreement)
        const payloadRec = {
            vinculo: {
                objeto: `Plano ${planData.name} - 791 Barber`,
                devedor: {
                    [doc.length > 11 ? 'cnpj' : 'cpf']: doc,
                    nome: tenant.name.substring(0, 100),
                    logradouro: (tenant.street || tenant.address_street || 'Rua não informada').substring(0, 60),
                    numero: (tenant.number || 'SN').substring(0, 10),
                    complemento: (tenant.complement || '').substring(0, 30),
                    bairro: (tenant.neighborhood || tenant.address_neighborhood || 'Centro').substring(0, 60),
                    cidade: (tenant.city || tenant.address_city || 'Cidade').substring(0, 60),
                    uf: (tenant.state || tenant.address_state || 'SC').substring(0, 2),
                    cep: (tenant.address_zip || tenant.cep || '00000000').replace(/\D/g, '').substring(0, 8)
                },
                contrato: `CTR-${tenant.id.slice(0, 8)}`
            },
            calendario: {
                dataInicial: new Date().toISOString().split('T')[0],
                periodicidade: 'MENSAL'
            },
            valor: {
                valorRec: amount.toFixed(2)
            },
            politicaRetentativa: 'PERMITE_3R_7D',
            loc: locId
        };

        const agreement = await inter.createRecurrenceAgreement(payloadRec);

        // 4. Salvar no Banco
        await getSupabaseAdmin()
            .from('finance')
            .insert({
                tenant_id: tenant.id,
                type: 'expense',
                value: amount,
                description: `Pix Automático - Plano ${planData.name}`,
                date: new Date().toISOString().split('T')[0],
                is_paid: false,
                metadata: {
                    is_saas_payment: true,
                    method: 'pix_automatico_inter',
                    id_rec: agreement.idRec,
                    loc_id: locId,
                    plan: planSlug,
                    interval: 1
                }
            });

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            idRec: agreement.idRec,
            pixPayload: agreement.pixCopiaECola || agreement.rec?.pixCopiaECola,
            amount: amount,
            status: agreement.status
        }));

    } catch (error: any) {
        console.error('[INTER PIX AUTO ERROR]', error);
        if (error.body) console.error('[INTER PIX AUTO DETALHES]', error.body);
        return addCorsHeaders(req, NextResponse.json({ error: error.message || 'Erro ao criar recorrência.', details: error.body }, { status: 500 }));
    }
}
