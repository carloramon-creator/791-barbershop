const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase
if (admin.apps.length === 0) {
    const serviceAccount = require('../firebase-service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runCronTest() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    console.log(`[TEST] Buscando aniversariantes para: ${day}/${month}`);

    const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .filter('birth_date', 'not.is', null);

    if (error) {
        console.error('Erro ao buscar clientes:', error);
        return;
    }

    const bdayToday = clients.filter(c => {
        if (!c.birth_date) return false;
        const d = new Date(c.birth_date);
        return (d.getUTCMonth() + 1) === month && d.getUTCDate() === day;
    });

    console.log(`[TEST] Encontrados ${bdayToday.length} aniversariantes.`);

    for (const client of bdayToday) {
        console.log(`[TEST] Processando: ${client.name} (${client.id})`);
        const voucherCode = `TEST-BDAY-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error: voucherError } = await supabase
            .from('client_vouchers')
            .insert({
                tenant_id: client.tenant_id,
                client_id: client.id,
                code: voucherCode,
                discount_type: 'percentage',
                discount_value: 10,
                is_birthday: true,
                expires_at: expiresAt.toISOString()
            });

        if (voucherError) {
            console.error(`Erro ao criar voucher para ${client.name}:`, voucherError);
            continue;
        }

        console.log(`[TEST] Voucher ${voucherCode} criado.`);

        if (client.fcm_token) {
            try {
                await admin.messaging().send({
                    token: client.fcm_token,
                    notification: {
                        title: `Parabéns, ${client.name}! 🎂 (TESTE)`,
                        body: `Hoje o presente é por nossa conta! Use o cupom ${voucherCode} e ganhe 10% de desconto.`,
                    }
                });
                console.log(`[TEST] Push enviado com sucesso para ${client.name}.`);
            } catch (pushErr) {
                console.error(`[TEST] Erro ao enviar push para ${client.name}:`, pushErr.message);
            }
        } else {
            console.log(`[TEST] ${client.name} não possui fcm_token.`);
        }
    }
}

runCronTest();
