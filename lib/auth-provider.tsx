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
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    tenant: null,
    loading: true,
    signOut: async () => { },
    role: null,
    refresh: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);

    const fetchSession = async () => {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // Obter role do usuário
                const { data } = await supabaseClient
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                setRole(data?.role ?? null);

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
                setTenant(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabaseClient.auth.signOut();
        setRole(null);
        setTenant(null);
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, tenant, loading, signOut, role, refresh: fetchSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
