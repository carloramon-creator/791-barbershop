export interface Tenant {
    id: string;
    name: string;
    plan: string;
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
    created_at: string;
}
