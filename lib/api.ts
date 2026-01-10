import { supabaseClient } from './supabase-client';

const BACKEND_URL = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL || '') : '';

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
    startWalkIn: (barberId: string, clientName: string) =>
        apiFetch(`/api/barbers/${barberId}/walk-in`, { method: 'POST', body: JSON.stringify({ clientName }) }),

    // Appointments
    getAppointments: (date?: string, barberId?: string) => {
        let url = '/api/appointments';
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (barberId) params.append('barberId', barberId);
        if (params.toString()) url += `?${params.toString()}`;
        return apiFetch(url);
    },
    getAvailability: (date: string, barberId: string, duration: number) =>
        apiFetch(`/api/appointments/availability?date=${date}&barberId=${barberId}&duration=${duration}`),
    createAppointment: (payload: Record<string, unknown>) =>
        apiFetch('/api/appointments', { method: 'POST', body: JSON.stringify(payload) }),
    updateAppointment: (id: string, payload: Record<string, unknown>) =>
        apiFetch(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteAppointment: (id: string) =>
        apiFetch(`/api/appointments/${id}`, { method: 'DELETE' }),

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

    // Product Categories
    getProductCategories: () => apiFetch('/api/products/categories'),
    createProductCategory: (payload: Record<string, unknown>) => apiFetch('/api/products/categories', { method: 'POST', body: JSON.stringify(payload) }),
    updateProductCategory: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/products/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteProductCategory: (id: string) => apiFetch(`/api/products/categories/${id}`, { method: 'DELETE' }),

    // Service Products (produtos utilizados em um serviço)
    getServiceProducts: (serviceId: string) => apiFetch(`/api/services/${serviceId}/products`),
    updateServiceProducts: (serviceId: string, productIds: string[]) =>
        apiFetch(`/api/services/${serviceId}/products`, { method: 'PUT', body: JSON.stringify({ productIds }) }),

    // Barber Services (serviços que um barbeiro pode executar)
    getBarberServices: (barberId: string) => apiFetch(`/api/barbers/${barberId}/services`),
    updateBarberServices: (barberId: string, serviceIds: string[]) =>
        apiFetch(`/api/barbers/${barberId}/services`, { method: 'PUT', body: JSON.stringify({ serviceIds }) }),

    // Finance
    getDre: (start: string, end: string) =>
        apiFetch(`/api/finance/dre?start=${start}&end=${end}`),

    // Analytics
    getDashboardSummary: () => apiFetch('/api/analytics/summary'),
    getDashboardMetrics: (period: string) => apiFetch(`/api/analytics/dashboard?period=${period}`),

    // Finance Records
    getFinanceRecords: () => apiFetch('/api/finance'),
    createFinanceRecord: (payload: Record<string, unknown>) => apiFetch('/api/finance', { method: 'POST', body: JSON.stringify(payload) }),
    updateFinanceRecord: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/finance/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    getFinanceCategories: () => apiFetch('/api/finance/categories'),
    createFinanceCategory: (payload: Record<string, unknown>) => apiFetch('/api/finance/categories', { method: 'POST', body: JSON.stringify(payload) }),

    // Management
    getBarbers: () => apiFetch('/api/barbers'),
    createBarber: (payload: Record<string, unknown>) => apiFetch('/api/barbers', { method: 'POST', body: JSON.stringify(payload) }),
    updateBarber: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/barbers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteBarber: (id: string) => apiFetch(`/api/barbers/${id}`, { method: 'DELETE' }),
    getBarberClosing: (id: string) => apiFetch(`/api/barbers/${id}/closing`),
    confirmBarberClosing: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/barbers/${id}/closing`, { method: 'POST', body: JSON.stringify(payload) }),
    revertBarberClosing: (barberId: string, financeId: string) => apiFetch(`/api/barbers/${barberId}/closing?financeId=${financeId}`, { method: 'DELETE' }),

    // Settings
    getBarbershop: () => apiFetch('/api/barbershop'),
    updateBarbershop: (payload: Record<string, unknown>) => apiFetch('/api/barbershop', { method: 'PUT', body: JSON.stringify(payload) }),

    // Users
    getUsers: () => apiFetch('/api/barbershop/users'),
    inviteUser: (payload: Record<string, unknown>) => apiFetch('/api/barbershop/users', { method: 'POST', body: JSON.stringify(payload) }),
    updateUser: (payload: Record<string, unknown>) => apiFetch('/api/barbershop/users', { method: 'PUT', body: JSON.stringify(payload) }),
    removeUser: (id: string) => apiFetch(`/api/barbershop/users?id=${id}`, { method: 'DELETE' }),
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
    getMovements: (start?: string, end?: string) => apiFetch(`/api/inventory/movements?start=${start || ''}&end=${end || ''}`),

    // Barber Status
    getMyBarberStatus: () => apiFetch('/api/barbers/me/status'),
    updateMyBarberStatus: (status: string) => apiFetch('/api/barbers/me/status', { method: 'PATCH', body: JSON.stringify({ status }) }),

    // System Administration
    getSystemTenants: () => apiFetch('/api/system/tenants'),
    getSystemStats: () => apiFetch('/api/system/stats'),
    getSystemSettings: () => apiFetch('/api/system/settings'),
    updateSystemSetting: (key: string, value: any) => apiFetch('/api/system/settings', { method: 'PUT', body: JSON.stringify({ key, value }) }),
    setupInterWebhook: () => apiFetch('/api/system/setup-inter-webhook'),
    updateSystemTenant: (id: string, updates: Record<string, any>) =>
        apiFetch(`/api/system/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    deleteSystemTenant: (id: string) => apiFetch(`/api/system/tenants/${id}`, { method: 'DELETE' }),

    // Public/Client Actions
    getPublicQueueStatus: (tenantId?: string) => apiFetch(`/api/public/queue?tenant_id=${tenantId || ''}`),
    enterPublicQueue: (payload: Record<string, any>) => apiFetch('/api/public/queue/enter', { method: 'POST', body: JSON.stringify(payload) }),
    getPublicTicket: (ticketId: string) => apiFetch(`/api/public/queue/ticket?id=${ticketId}`),
    cancelPublicTicket: (ticketId: string) => apiFetch(`/api/public/queue/cancel`, { method: 'PUT', body: JSON.stringify({ ticketId }) }),
};
