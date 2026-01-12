export type BusinessType = 'barbershop' | 'beauty_salon';

export interface BusinessTheme {
    primary: string;
    primaryHex: string;
    secondary: string;
    accent: string;
    gradient: string;
    sidebarBg: string;
    mainBg: string;
    cardBg: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    textBranding: string;
    primaryMuted: string;
}

export const BUSINESS_THEMES: Record<BusinessType, BusinessTheme> = {
    barbershop: {
        primary: 'blue',
        primaryHex: '#3B82F6',
        secondary: 'slate',
        accent: 'yellow',
        gradient: 'from-blue-600 to-slate-900',
        sidebarBg: '#0a1628',
        mainBg: '#020617',
        cardBg: '#0f172a',
        cardBorder: '#1e293b',
        textPrimary: '#F8FAFC', // slate-50
        textSecondary: '#94A3B8', // slate-400
        textBranding: '#3B82F6',
        primaryMuted: 'rgba(59, 130, 246, 0.2)',
    },
    beauty_salon: {
        primary: 'amber',
        primaryHex: '#B45309', // Amber-700 (Ocre)
        secondary: 'orange',
        accent: 'yellow',
        gradient: 'from-[#B45309] to-[#1D1411]',
        sidebarBg: '#1D1411',
        mainBg: '#FFFFFF', // Light background for Salon
        cardBg: '#FFFFFF', // White cards
        cardBorder: '#E2E8F0', // slate-200
        textPrimary: '#0F172A', // slate-900
        textSecondary: '#64748B', // slate-500
        textBranding: '#D97706',
        primaryMuted: 'rgba(180, 83, 9, 0.2)',
    }
};

export function getBusinessTheme(type: BusinessType = 'barbershop') {
    return BUSINESS_THEMES[type] || BUSINESS_THEMES.barbershop;
}
