'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabaseClient } from './supabase-client';
import { Session, User } from '@supabase/supabase-js';
import { Api } from './api';
import { Tenant } from './types';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    tenant: Tenant | null;
    loading: boolean;
    signOut: () => Promise<void>;
    role: string | null;
    roles: string[] | null;
    isSystemAdmin: boolean;
    isImpersonating: boolean;
    refresh: () => Promise<void>;
    checkPermission: (action: string) => boolean;
    profile: { name: string; nickname: string; email: string; photo_url: string } | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    tenant: null,
    loading: true,
    signOut: async () => { },
    role: null,
    roles: null,
    isSystemAdmin: false,
    isImpersonating: false,
    refresh: async () => { },
    checkPermission: () => false,
    profile: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);
    const [roles, setRoles] = useState<string[] | null>(null);
    const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(false);
    const [profile, setProfile] = useState<{ name: string; nickname: string; email: string; photo_url: string } | null>(null);

    const [isImpersonating, setIsImpersonating] = useState(false);

    const fetchSession = async () => {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);

            // Detectar impersonate via cookie no client-side
            const impersonateCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('impersonate_tenant_id='));
            setIsImpersonating(!!impersonateCookie);

            if (session?.user) {
                // Obter role e perfil do usuário
                const { data } = await supabaseClient
                    .from('users')
                    .select('role, roles, is_system_admin, name, nickname, email, photo_url')
                    .eq('id', session.user.id)
                    .single();
                setRole(data?.role ?? null);
                setRoles(data?.roles ?? (data?.role ? [data.role] : null));
                setIsSystemAdmin(data?.is_system_admin ?? false);
                setProfile(data ? {
                    name: data.name,
                    nickname: data.nickname,
                    email: data.email,
                    photo_url: data.photo_url
                } : null);

                // Obter tenant/branding
                // Como Api.getBarbershop usa a session (que acabamos de pegar), 
                // talvez precisemos garantir que o client esteja autenticado.
                // Mas supabaseClient retém a sessão.
                // Porém, nossa Api.ts pega a sessão de novo.
                try {
                    const tenantData = await Api.getBarbershop();
                    setTenant(tenantData);
                } catch (e) {
                    console.error("Failed to load tenant", e);
                }
            } else {
                setRole(null);
                setRoles(null);
                setIsSystemAdmin(false);
                setProfile(null);
                setTenant(null);
            }
        } catch (error) {
            console.error("Auth fetch error", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSession();

        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
            // Re-run fetch logic if simpler, or just update session
            // But simpler to just call fetchSession to update role/tenant as well
            // Wait, infinite loop risk? No, if session changes.
            // But onAuthStateChange gives session. 
            // We'll just update state.
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // For now, re-fetching full details can be slightly redundant but safe
                fetchSession();
            } else {
                setRole(null);
                setRoles(null);
                setTenant(null);
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            if (roles?.includes('barber')) {
                await Api.updateMyBarberStatus('offline');
            }
        } catch (e) {
            console.error("Failed to set barber offline during logout", e);
        }
        await supabaseClient.auth.signOut();
        setRole(null);
        setRoles(null);
        setIsSystemAdmin(false);
        setProfile(null);
        setTenant(null);
        setUser(null);
        setSession(null);
    };

    const checkPermission = (action: string): boolean => {
        if (!role) return false;
        if (role === 'owner') return true;

        // If settings not loaded or no permissions config, fallback to default hardcoded? 
        // Or actually, if we want to support dynamic, we should use some defaults matching current logic if empty.
        // Current logic is spread across components, so this helper is new.
        // Let's implement looking at tenant settings.

        if (tenant?.settings?.permissions) {
            const perm = tenant.settings.permissions.find((p: any) => p.action === action);
            if (perm) {
                // @ts-ignore
                return !!perm[role];
            }
        }

        // Fallbacks if not found in custom settings (Backward compatibility)
        // We can map action strings to logic, but strictly speaking this helper is for the new system.
        return false;
    };

    return (
        <AuthContext.Provider value={{
            user, session, tenant, loading, signOut, role, roles, isSystemAdmin, isImpersonating, refresh: fetchSession,
            checkPermission, profile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
