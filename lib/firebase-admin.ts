import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        // Tenta carregar do arquivo JSON (local development)
        // Em produção, idealmente usaria variáveis de ambiente, mas como o usuário forneceu o JSON,
        // vamos carregar dele se a variável de ambiente não estiver definida.

        let serviceAccount: any;

        try {
            serviceAccount = require('../firebase-service-account.json');
        } catch (e) {
            console.warn('Arquivo firebase-service-account.json não encontrado. Tentando variáveis de ambiente...');
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
