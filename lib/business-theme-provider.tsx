'use client';

import React, { useEffect } from 'react';
import { useAuth } from './auth-provider';
import { getBusinessTheme } from './business-theme';

export function BusinessThemeProvider({ children }: { children: React.ReactNode }) {
    const { tenant } = useAuth();
    const theme = getBusinessTheme(tenant?.business_type);

    useEffect(() => {
        if (!theme) return;

        const root = document.documentElement;
        root.style.setProperty('--primary-business', theme.primaryHex);

        if (tenant?.business_type === 'beauty_salon') {
            root.style.setProperty('--sidebar-business', '#1c140a');
            root.style.setProperty('--bg-business', '#0d0905');
        } else {
            root.style.setProperty('--sidebar-business', '#0a1628');
            root.style.setProperty('--bg-business', '#020617');
        }
    }, [tenant?.business_type, theme]);

    return <>{children}</>;
}
