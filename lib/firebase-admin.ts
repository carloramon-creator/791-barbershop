import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        // Tenta carregar do arquivo JSON (local development)
        // Em produção, idealmente usaria variáveis de ambiente, mas como o usuário forneceu o JSON,
        // vamos carregar dele se a variável de ambiente não estiver definida.

        let serviceAccount: any;
        // Tenta usar variáveis de ambiente primeiro
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            serviceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            };
        } else {
            console.warn('Firebase credentials not found in environment variables.');
        }

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

    } catch (error: any) {
        console.error('Firebase admin initialization error', error.stack);
    }
}

export const firebaseAdmin = admin;
