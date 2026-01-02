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

export type UserRole = 'owner' | 'barber' | 'client' | 'staff';

export type Plan = 'free' | 'premium' | 'business';

export interface User {
  id: string;
  tenant_id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  plan?: Plan;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
