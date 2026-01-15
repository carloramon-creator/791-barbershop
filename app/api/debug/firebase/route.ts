import { NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const envCheck = {
            FIREBASE_PROJECT_ID: CheckVar(process.env.FIREBASE_PROJECT_ID),
            FIREBASE_CLIENT_EMAIL: CheckVar(process.env.FIREBASE_CLIENT_EMAIL),
            FIREBASE_PRIVATE_KEY: CheckVar(process.env.FIREBASE_PRIVATE_KEY),
            APPS_LENGTH: firebaseAdmin.apps.length,
            APPS_NAMES: firebaseAdmin.apps.map(a => a?.name),
        };

        return NextResponse.json({
            status: 'Diagnostic',
            environment: envCheck,
            message: firebaseAdmin.apps.length
                ? 'Firebase Admin inicializado com sucesso!'
                : 'FALHA: Firebase Admin não foi inicializado. Verifique as variáveis de ambiente.'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        if (!firebaseAdmin.apps.length) {
            return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
        }

        const body = await req.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const message = {
            token: token,
            notification: {
                title: 'Teste de Notificação',
                body: 'Se você recebeu isso, o sistema está funcionando!',
            },
            data: {
                test: 'true'
            }
        };

        const response = await firebaseAdmin.messaging().send(message);
        return NextResponse.json({ success: true, messageId: response });

    } catch (error: any) {
        console.error('Test notification failed:', error);
        return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }
}

function CheckVar(val: string | undefined) {
    if (!val) return 'MISSING';
    if (val.length < 5) return 'TOO_SHORT';
    return 'PRESENT (' + val.substring(0, 3) + '...)';
}
