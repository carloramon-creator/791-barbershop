
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const frontendUrl = process.env.NEXT_PUBLIC_OWNER_URL || 'https://frontend-owner-production.up.railway.app';

if (!supabaseUrl || !supabaseServiceKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const emails = ['carapipinto@gmail.com', 'tete@tete.com', 'isa@isa.com'];

async function generateLinks() {
    console.log('🔗 Gerando links de convite (para /ativar-conta)...\n');

    for (const email of emails) {
        // Tenta Invite primeiro
        let { data, error } = await supabase.auth.admin.generateLink({
            type: 'invite',
            email,
            options: { redirectTo: `${frontendUrl}/ativar-conta` }
        });

        // Se falhar (ex: usuario ja confirmado), tenta Recovery (Magic Link)
        if (error || !data.properties?.action_link) {
            const { data: recData, error: recError } = await supabase.auth.admin.generateLink({
                type: 'recovery',
                email,
                options: { redirectTo: `${frontendUrl}/ativar-conta` }
            });

            if (!recError) {
                data = recData;
                error = null;
            }
        }

        if (error) {
            console.log(`❌ [${email}]: Erro - ${error.message}`);
        } else {
            const rawLink = data.properties.action_link;
            // Formatar link manual
            const urlObj = new URL(rawLink);
            const token = urlObj.searchParams.get('token');
            const type = urlObj.searchParams.get('type');

            const finalLink = `${frontendUrl}/ativar-conta?token=${token}&type=${type}`;

            console.log(`✅ [${email}]:`);
            console.log(`   Link Seguro: ${finalLink}`);
            console.log(`   (Raw Link: ${rawLink})\n`);
        }
    }
}

generateLinks();
