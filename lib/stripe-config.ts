// Configuração dos planos e preços do Stripe no frontend

export interface PlanConfig {
    id: string;
    name: string;
    price: number;
    priceId: string; // ID do Price no Stripe (será configurado via env)
    features: string[];
    discount_semiannual?: number;
    discount_annual?: number;
}

export const PLANS: Record<string, PlanConfig> = {
    basic: {
        id: 'basic',
        name: 'Básico',
        price: 49,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC || 'price_1SlEJ2LzRSgzMHRZERmJwYgH',
        discount_semiannual: 10,
        discount_annual: 20,
        features: [
            'Até 3 barbeiros',
            '50 agendamentos/mês',
            'Suporte por email',
        ],
    },
    complete: {
        id: 'complete',
        name: 'Completo',
        price: 99,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_COMPLETE || 'price_1SlEJbLzRSgzMHRZAleKdO0C',
        discount_semiannual: 10,
        discount_annual: 20,
        features: [
            'Até 10 barbeiros',
            '200 agendamentos/mês',
            'Suporte prioritário',
        ],
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        price: 169,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || 'price_1SlEK9LzRSgzMHRZuw1ZcbwS',
        discount_semiannual: 10,
        discount_annual: 20,
        features: [
            'Barbeiros ilimitados',
            'Agendamentos ilimitados',
            'Suporte 24/7',
        ],
    },
};
