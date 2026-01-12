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

        // Define CSS variables based on business theme
        root.style.setProperty('--primary-business', theme.primaryHex);

    }, [tenant?.business_type, theme]);

    return <>{children}</>;
}
