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
        root.style.setProperty('--sidebar-bg', theme.sidebarBg);
        root.style.setProperty('--main-bg', theme.mainBg);
        root.style.setProperty('--text-branding', theme.textBranding);
        root.style.setProperty('--primary-muted', theme.primaryMuted);

        // You can also override standard tailwind colors if needed
        // but using these custom vars is cleaner for dynamic switches

    }, [tenant?.business_type, theme]);

    return <>{children}</>;
}
