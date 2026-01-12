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
        primary: 'pink',
        primaryHex: '#EC4899',
        secondary: 'purple',
        accent: 'amber',
        gradient: 'from-pink-500 to-purple-900',
    }
};

export function getBusinessTheme(type: BusinessType = 'barbershop') {
    return BUSINESS_THEMES[type] || BUSINESS_THEMES.barbershop;
}
