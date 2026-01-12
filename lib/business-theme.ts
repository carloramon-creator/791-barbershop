export type BusinessType = 'barbershop' | 'beauty_salon';

export interface BusinessTheme {
    primary: string;
    primaryHex: string;
    secondary: string;
    accent: string;
    gradient: string;
}

export const BUSINESS_THEMES: Record<BusinessType, BusinessTheme> = {
    barbershop: {
        primary: 'blue',
        primaryHex: '#3B82F6',
        secondary: 'slate',
        accent: 'yellow',
        gradient: 'from-blue-600 to-slate-900',
    },
    beauty_salon: {
        primary: 'pink',
        primaryHex: '#DB2777',
        secondary: 'rose',
        accent: 'fuchsia',
        gradient: 'from-pink-600 to-rose-900',
    }
};

export function getBusinessTheme(type: BusinessType = 'barbershop') {
    return BUSINESS_THEMES[type] || BUSINESS_THEMES.barbershop;
}
