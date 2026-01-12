export type BusinessType = 'barbershop' | 'beauty_salon';

export const BUSINESS_THEMES = {
    barbershop: {
        primary: 'blue',
        primaryHex: '#3B82F6',
        secondary: 'slate',
        accent: 'yellow',
        gradient: 'from-blue-600 to-slate-900',
    },
    beauty_salon: {
        primary: 'amber',
        primaryHex: '#D97706',
        secondary: 'orange',
        accent: 'yellow',
        gradient: 'from-amber-600 to-orange-900',
    }
};

export function getBusinessTheme(type: BusinessType = 'barbershop') {
    return BUSINESS_THEMES[type] || BUSINESS_THEMES.barbershop;
}
