import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

/**
 * GET: Retorna as configurações atuais de NFS-e (sem a senha por segurança)
 */
export async function GET(req: Request) {
    try {
        const { roles } = await getCurrentUserAndTenant();
        if (!roles.includes('system_admin')) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const { data: settings, error } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'nfse_config')
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        const config = settings?.value || {
            environment: 'homologacao',
            certificateUploaded: false,
            lastUpdated: null
        };

        // Remove a senha antes de enviar para o front
        if (config.passphrase) delete config.passphrase;
        if (config.pfxBase64) {
            config.certificateUploaded = true;
            delete config.pfxBase64;
        }

        return addCorsHeaders(req, NextResponse.json(config));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

/**
 * POST: Salva as configurações de NFS-e
 */
export async function POST(req: Request) {
    try {
        const { roles } = await getCurrentUserAndTenant();
        if (!roles.includes('system_admin')) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const body = await req.json();
        const { environment, pfxBase64, passphrase, auto_emit } = body;

        // Busca configuração existente
        const { data: existing } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'nfse_config')
            .single();

        const newValue = {
            ...(existing?.value || {}),
            environment: environment || existing?.value?.environment || 'homologacao',
            auto_emit: auto_emit !== undefined ? auto_emit : existing?.value?.auto_emit || false,
            lastUpdated: new Date().toISOString()
        };

        if (pfxBase64) newValue.pfxBase64 = pfxBase64;
        if (passphrase) newValue.passphrase = passphrase;

        const { error } = await supabaseAdmin
            .from('system_settings')
            .upsert({
                key: 'nfse_config',
                value: newValue,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json({ success: true, message: 'Configurações salvas com sucesso' }));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
