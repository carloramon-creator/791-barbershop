export type Plan = 'basic' | 'intermediate' | 'complete' | 'premium';
export type UserRole = 'owner' | 'barber' | 'client' | 'staff';

export interface Tenant {
    id: string;
    name: string;
    plan: string; // Keeping as string to avoid strict enum conflicts for now, or match Plan type
    stripe_id?: string;
    cnpj?: string;
    phone?: string;
    address?: string;
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    logo_url?: string;
    subscription_status?: 'trial' | 'active' | 'canceled' | 'past_due' | 'expired';
    subscription_current_period_end?: string;
    created_at: string;
}

export interface User {
    id: string;
    tenant_id: string;
    role: UserRole;
    name?: string;
    email: string;
    photo_url?: string;
    created_at: string;
}
