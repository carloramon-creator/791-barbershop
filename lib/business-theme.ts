export type BusinessType = 'barbershop' | 'beauty_salon';

export interface BusinessTheme {
    primary: string;
    primaryHex: string;
    primaryLight: string;
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
        primaryLight: '#DBEAFE', // blue-100
        secondary: 'slate',
        accent: 'yellow',
        gradient: 'from-blue-600 to-slate-900',
        sidebarBg: '#0a1628',
        mainBg: '#020617',
        cardBg: '#0f172a',
        cardBorder: '#1e293b',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        textBranding: '#3B82F6',
        primaryMuted: 'rgba(59, 130, 246, 0.2)',
    },
    beauty_salon: {
        primary: 'amber',
        primaryHex: '#B45309', // Amber-700 (Ocre)
        primaryLight: '#FEF3C7', // Amber-100 (Ocre clarinho)
        secondary: 'orange',
        accent: 'yellow',
        gradient: 'from-[#B45309] to-[#1D1411]',
        sidebarBg: '#1D1411',
        mainBg: '#FFFBEB', // Amber-50 (Cream/Light Ocre background)
        cardBg: '#FFFFFF', // White cards
        cardBorder: '#FEF3C7', // Amber-100 Border
        textPrimary: '#1D1411', // Dark Coffee text
        textSecondary: '#92400E', // Amber-800 text
        textBranding: '#D97706',
        primaryMuted: 'rgba(180, 83, 9, 0.2)',
    }
};

export function getBusinessTheme(type: BusinessType = 'barbershop') {
    return BUSINESS_THEMES[type] || BUSINESS_THEMES.barbershop;
}
