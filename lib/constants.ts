export const PLAN_CONFIG = {
    trial: {
        maxBarbers: 100,
        maxAppointments: 1000,
        features: ['all']
    },
    basic: {
        maxBarbers: 3,
        maxAppointments: 50,
        features: ['queue']
    },
    complete: {
        maxBarbers: 10,
        maxAppointments: 200,
        features: ['queue', 'finance']
    },
    premium: {
        maxBarbers: 1000,
        maxAppointments: 1000000,
        features: ['all']
    }
};

export type PlanType = keyof typeof PLAN_CONFIG;
