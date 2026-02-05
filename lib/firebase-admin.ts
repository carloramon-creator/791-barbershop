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
            // Tenta carregar do arquivo local se estiver disponível
            try {
                const fs = require('fs');
                const path = require('path');
                const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

                if (fs.existsSync(serviceAccountPath)) {
                    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                    console.log('Firebase initialized from firebase-service-account.json');
                } else {
                    console.warn('Firebase credentials not found in environment variables or firebase-service-account.json');
                }
            } catch (fsError) {
                console.warn('Error reading firebase-service-account.json', fsError);
            }
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
