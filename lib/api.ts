import { supabaseClient } from './supabase-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

async function apiFetch(path: string, options: RequestInit = {}) {
    // Buscar sessão atual para pegar o JWT
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session?.access_token;

    // Timeout de 30 segundos
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 30000);

    try {
        const res = await fetch(`${BACKEND_URL}${path}`, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(options.headers || {}),
            },
            cache: 'no-store',
        });

        clearTimeout(id);

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            // Lógica para retornar apenas a mensagem pura do servidor
            const errorMessage = errorData.error || errorData.message || res.statusText;
            throw new Error(errorMessage);
        }
        return res.json();
    } catch (err: unknown) {
        clearTimeout(id);
        const error = err as Error;
        console.error(`[API ERROR] Failure fetching ${path}:`, error);
        if (error.name === 'AbortError') {
            throw new Error(`O servidor demorou muito para responder (Timeout).`);
        }
        throw error;
    }
}

export const Api = {
    // Queues
    getQueueStatus: () => apiFetch('/api/queue/status'),
    barberNext: (barberId: string) =>
        apiFetch(`/api/barbers/${barberId}/next`, { method: 'PUT' }),
    finishService: (queueId: string) =>
        apiFetch(`/api/queue/${queueId}/finish`, { method: 'PUT' }),
    startSpecificClient: (queueId: string) =>
        apiFetch(`/api/queue/${queueId}/start`, { method: 'PUT' }),
    cancelClient: (queueId: string) =>
        apiFetch(`/api/queue/${queueId}/cancel`, { method: 'PUT' }),

    // Sales
    createSale: (queueId: string, payload: Record<string, unknown>) =>
        apiFetch(`/api/queue/${queueId}/sale`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    getSales: () => apiFetch('/api/sales'),

    // Catalog
    getServices: () => apiFetch('/api/services'),
    createService: (payload: Record<string, unknown>) => apiFetch('/api/services', { method: 'POST', body: JSON.stringify(payload) }),
    updateService: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/services/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteService: (id: string) => apiFetch(`/api/services/${id}`, { method: 'DELETE' }),

    getProducts: () => apiFetch('/api/products'),
    createProduct: (payload: Record<string, unknown>) => apiFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) }),
    updateProduct: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteProduct: (id: string) => apiFetch(`/api/products/${id}`, { method: 'DELETE' }),

    // Finance
    getDre: (start: string, end: string) =>
        apiFetch(`/api/finance/dre?start=${start}&end=${end}`),

    // Analytics
    getDashboardSummary: () => apiFetch('/api/analytics/summary'),
    getDashboardMetrics: () => apiFetch('/api/analytics/dashboard'),

    // Finance Records
    getFinanceRecords: () => apiFetch('/api/finance'),
    createFinanceRecord: (payload: Record<string, unknown>) => apiFetch('/api/finance', { method: 'POST', body: JSON.stringify(payload) }),
    getFinanceCategories: () => apiFetch('/api/finance/categories'),
    createFinanceCategory: (payload: Record<string, unknown>) => apiFetch('/api/finance/categories', { method: 'POST', body: JSON.stringify(payload) }),

    // Management
    getBarbers: () => apiFetch('/api/barbers'),
    createBarber: (payload: Record<string, unknown>) => apiFetch('/api/barbers', { method: 'POST', body: JSON.stringify(payload) }),
    updateBarber: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/barbers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteBarber: (id: string) => apiFetch(`/api/barbers/${id}`, { method: 'DELETE' }),

    // Settings
    getBarbershop: () => apiFetch('/api/barbershop'),
    updateBarbershop: (payload: Record<string, unknown>) => apiFetch('/api/barbershop', { method: 'PUT', body: JSON.stringify(payload) }),

    // Users
    getUsers: () => apiFetch('/api/barbershop/users'),
    inviteUser: (payload: Record<string, unknown>) => apiFetch('/api/barbershop/users', { method: 'POST', body: JSON.stringify(payload) }),
    async updateUser(payload: Record<string, unknown>) {
        return apiFetch('/api/barbershop/users', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    },

    async removeUser(id: string) {
        return apiFetch(`/api/barbershop/users?id=${id}`, { method: 'DELETE' });
    },

    generateInviteLink: (userId: string) => apiFetch('/api/barbershop/users', {
        method: 'POST',
        body: JSON.stringify({ userId, generateInvite: true })
    }),

    // Plan
    getPlan: () => apiFetch('/api/barbershop/plan'),
    updatePlan: (payload: Record<string, unknown>) => apiFetch('/api/barbershop/plan', { method: 'PUT', body: JSON.stringify(payload) }),

    // Inventory
    getInventory: () => apiFetch('/api/inventory'),
    createMovement: (payload: Record<string, unknown>) => apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify(payload) }),

    // Barber Status
    getMyBarberStatus: () => apiFetch('/api/barbers/me/status'),
    updateMyBarberStatus: (status: string) => apiFetch('/api/barbers/me/status', { method: 'PATCH', body: JSON.stringify({ status }) }),
};
