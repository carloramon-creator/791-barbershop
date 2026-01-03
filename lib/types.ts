export type Plan = 'basic' | 'complete' | 'premium' | 'trial';
export type UserRole = 'owner' | 'barber' | 'client' | 'staff';
export type BarberStatus = 'available' | 'busy';
export type QueueStatus = 'waiting' | 'attending' | 'finished' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'pix';
export type FinanceType = 'revenue' | 'expense';

export interface Tenant {
    id: string;
    name: string;
    plan: Plan;
    stripe_id?: string;
    cnpj?: string;
    phone?: string;
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    logo_url?: string;
    subscription_status?: string;
    subscription_current_period_end?: string;
    created_at: string;
}

export interface User {
    id: string;
    tenant_id: string;
    email: string;
    name: string;
    role: UserRole;
    roles?: UserRole[];
    phone?: string;
    cpf?: string;
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    photo_url?: string;
    avg_service_time?: number;
    commission_type?: 'fixed' | 'percentage';
    commission_value?: number;
    last_seen_at?: string;
    created_at: string;
}

export interface Barber {
    id: string;
    tenant_id: string;
    name: string;
    photo_url?: string;
    status: BarberStatus;
    avg_time_minutes: number;
    is_active?: boolean;
    created_at: string;
}

export interface ClientQueue {
    id: string;
    tenant_id: string;
    barber_id: string;
    client_id?: string;
    client_name: string;
    status: QueueStatus;
    position: number;
    estimated_time_minutes?: number;
    started_at?: string;
    finished_at?: string;
    created_at: string;
}

export interface Service {
    id: string;
    tenant_id: string;
    name: string;
    price: number;
    created_at: string;
}

export interface Product {
    id: string;
    tenant_id: string;
    name: string;
    price: number;
    cost_price?: number;
    stock_quantity?: number;
    min_stock?: number;
    created_at: string;
}

export interface Sale {
    id: string;
    tenant_id: string;
    client_queue_id: string;
    services?: { id: string; qty: number }[];
    products?: { id: string; qty: number }[];
    total: number;
    payment_method: PaymentMethod;
    pix_payload?: string;
    paid: boolean;
    created_at: string;
}

export interface Finance {
    id: string;
    tenant_id: string;
    type: FinanceType;
    value: number;
    description?: string;
    date: string;
    created_at: string;
}
