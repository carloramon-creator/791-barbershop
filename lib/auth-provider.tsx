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
    adminPermissions: string[] | null;
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
    adminPermissions: null,
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
    const [adminPermissions, setAdminPermissions] = useState<string[] | null>(null);
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
                // Obter role, perfil e tenant em paralelo para maior velocidade
                const [userRes, tenantRes] = await Promise.all([
                    supabaseClient
                        .from('users')
                        .select('role, roles, is_system_admin, admin_permissions, name, nickname, email, photo_url')
                        .eq('id', session.user.id)
                        .single(),
                    Api.getBarbershop().catch(e => {
                        console.error("Failed to load tenant", e);
                        return null;
                    })
                ]);

                const userData = userRes.data;
                setRole(userData?.role ?? null);
                setRoles(userData?.roles ?? (userData?.role ? [userData.role] : null));
                setIsSystemAdmin(userData?.is_system_admin ?? false);
                setAdminPermissions(userData?.admin_permissions ?? (userData?.is_system_admin ? ['all'] : null));

                setProfile(userData ? {
                    name: userData.name,
                    nickname: userData.nickname,
                    email: userData.email,
                    photo_url: userData.photo_url
                } : null);

                setTenant(tenantRes);
            } else {
                setRole(null);
                setRoles(null);
                setIsSystemAdmin(false);
                setAdminPermissions(null);
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
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchSession();
            } else {
                setRole(null);
                setRoles(null);
                setTenant(null);
                setProfile(null);
                setIsSystemAdmin(false);
                setAdminPermissions(null);
                setLoading(false);
            }
        });

        // Heartbeat para manter last_seen_at atualizado (Real-time Online Status)
        const heartbeat = setInterval(async () => {
            const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
            if (currentSession?.user) {
                await supabaseClient
                    .from('users')
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq('id', currentSession.user.id);
            }
        }, 1000 * 60 * 2); // A cada 2 minutos

        return () => {
            subscription.unsubscribe();
            clearInterval(heartbeat);
        };
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
        setAdminPermissions(null);
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
            user, session, tenant, loading, signOut, role, roles, isSystemAdmin, adminPermissions, isImpersonating, refresh: fetchSession,
            checkPermission, profile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
