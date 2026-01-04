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
    client_phone?: string;
    is_priority?: boolean;
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
    total_amount: number;
    payment_method: PaymentMethod;
    pix_payload?: string;
    paid: boolean;
    created_at: string;
}

export interface FinanceCategory {
    id: string;
    tenant_id: string;
    name: string;
    type: FinanceType;
    created_at: string;
}

export interface FinanceRecord {
    id: string;
    tenant_id: string;
    type: FinanceType;
    value: number;
    description: string;
    date: string;
    category_id?: string;
    finance_categories?: {
        name: string;
    };
    is_recurring?: boolean;
    recurrence_period?: 'day' | 'week' | 'month' | 'year' | null;
    recurrence_count?: number;
    created_at: string;
}

export interface ProductMovement {
    id: string;
    tenant_id: string;
    product_id: string;
    type: 'entry' | 'exit';
    quantity: number;
    cost_price?: number;
    price?: number;
    description?: string;
    created_at: string;
    products?: {
        name: string;
        price: number;
    };
}

export interface DashboardSummary {
    metrics: {
        billingToday: number;
        queueCount: number;
        avgWaitTime: number;
        onlineBarbers: number;
        busyBarbers: number;
    };
    queueStatus: BarberQueueStatus[];
}

export interface BarberQueueStatus {
    barber_id: string;
    barber_name: string;
    user_id?: string;
    photo_url?: string;
    status: 'online' | 'offline' | 'busy';
    is_active?: boolean;
    avg_time_minutes: number;
    queue: ClientQueue[];
    total_estimated_wait_minutes: number;
}
