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
    stripe_subscription_id?: string;
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
    pix_key?: string;
    pix_key_type?: string;
    bank_code?: string;
    bank_agency?: string;
    bank_account?: string;
    bank_account_digit?: string;
    bank_account_holder?: string;
    bank_account_doc?: string;
    business_type?: 'barbershop' | 'beauty_salon';
    slug?: string;
    subscription_status?: string;
    subscription_current_period_end?: string;
    module_queue_enabled?: boolean;
    module_appointments_enabled?: boolean;
    terms_accepted_at?: string;
    terms_version?: string;
    settings?: {
        permissions?: Array<{
            action: string;
            owner: boolean;
            staff: boolean;
            barber: boolean;
            desc: string;
        }>;
        [key: string]: any;
    };
    active_addons?: string[];
    system_plan?: {
        menu_permissions: string[];
        staff_limit: number;
    };
    cpf?: string;
    fiscal_config?: {
        environment: 'homologacao' | 'producao';
        pfx_base64?: string;
        passphrase?: string;
        service_code?: string;
        auto_emit?: boolean;
        municipal_code?: string;
    };
    lunch_start?: string;
    lunch_end?: string;
    created_at: string;
}

export interface User {
    id: string;
    tenant_id: string;
    email: string;
    name: string;
    nickname?: string;
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
    cnpj_mei?: string;
    avg_service_time?: number;
    commission_type?: 'fixed' | 'percentage';
    commission_value?: number;
    last_seen_at?: string;
    birth_date?: string;
    created_at: string;
}

export interface Barber {
    id: string;
    tenant_id: string;
    name: string;
    nickname?: string;
    photo_url?: string;
    birth_date?: string;
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
    client_photo?: string;
    client_phone?: string;
    is_priority?: boolean;
    status: QueueStatus;
    position: number;
    estimated_time_minutes?: number;
    started_at?: string;
    finished_at?: string;
    draft_items?: any[];
    created_at: string;
}

export interface Service {
    id: string;
    tenant_id: string;
    name: string;
    price: number;
    duration_minutes?: number;
    product_ids?: string[];
    created_at: string;
}

export interface ProductCategory {
    id: string;
    tenant_id: string;
    name: string;
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
    category_id?: string;
    category_name?: string;
    created_at: string;
}


// --- HOLDING FINANCE SYSTEM TYPES ---

export interface HoldingAccount {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'investment' | 'cash';
    balance: number;
    is_active: boolean;
    is_default: boolean;
    bank_name?: string;
    created_at: string;
}

export interface HoldingCategory {
    id: string;
    name: string;
    type: 'income' | 'expense';
    parent_id?: string | null;
    color?: string;
    icon?: string;
    is_active: boolean;
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
    is_paid: boolean;
    paid_date?: string | null;
    paid_amount?: number | null;
    metadata?: any;
    barber_id?: string;
    barbers?: {
        name: string;
    };
    created_at: string;
}

export interface Sale {
    id: string;
    tenant_id: string;
    client_queue_id: string;
    services?: { id: string; qty: number }[];
    products?: { id: string; qty: number }[];
    total_amount: number;
    total_value?: number; // Alias used in some code
    payment_method: PaymentMethod;
    pix_payload?: string;
    paid: boolean;
    barber_id?: string;
    barbers?: {
        name: string;
    };
    client_queue?: {
        client_name: string;
    };
    barber_commission_paid: boolean;
    commission_value?: number;
    barber_commission_value?: number; // Alias used in some code
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
    barber_nickname?: string;
    user_id?: string;
    photo_url?: string;
    status: 'available' | 'busy' | 'offline';
    is_active?: boolean;
    avg_time_minutes: number;
    queue: ClientQueue[];
    total_estimated_wait_minutes: number;
}
