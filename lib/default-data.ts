export type BusinessType = 'barbershop' | 'beauty_salon';

export const DEFAULT_SERVICES = {
    barbershop: [
        { name: 'Corte Masculino', price: 35.00, duration_minutes: 30 },
        { name: 'Barba', price: 25.00, duration_minutes: 20 },
        { name: 'Corte + Barba', price: 55.00, duration_minutes: 50 },
        { name: 'Corte Infantil', price: 25.00, duration_minutes: 20 },
        { name: 'Sobrancelha', price: 15.00, duration_minutes: 10 },
        { name: 'Pintura/Luzes', price: 80.00, duration_minutes: 90 },
        { name: 'Barboterapia', price: 120.00, duration_minutes: 60 },
    ],
    beauty_salon: [
        { name: 'Corte Feminino', price: 50.00, duration_minutes: 40 },
        { name: 'Coloração', price: 150.00, duration_minutes: 120 },
        { name: 'Escova', price: 40.00, duration_minutes: 30 },
        { name: 'Manicure', price: 30.00, duration_minutes: 30 },
        { name: 'Pedicure', price: 35.00, duration_minutes: 40 },
        { name: 'Hidratação', price: 60.00, duration_minutes: 45 },
        { name: 'Massagem Capilar', price: 45.00, duration_minutes: 30 },
        { name: 'Penteado', price: 80.00, duration_minutes: 60 },
    ],
};

export const DEFAULT_CATEGORIES = [
    { name: 'Bebidas', description: 'Água, café, refrigerantes' },
    { name: 'Alimentos', description: 'Snacks e comidas' },
    { name: 'Cosméticos', description: 'Produtos de beleza e cuidados' },
    { name: 'Produtos Capilares', description: 'Shampoos, condicionadores, etc' },
];

export const DEFAULT_PRODUCTS = {
    barbershop: [
        { name: 'Água Mineral 500ml', price: 3.00, category: 'Bebidas' },
        { name: 'Café Expresso', price: 5.00, category: 'Bebidas' },
        { name: 'Cerveja Lata', price: 8.00, category: 'Bebidas' },
        { name: 'Pomada Modeladora', price: 35.00, category: 'Cosméticos' },
        { name: 'Óleo para Barba', price: 45.00, category: 'Cosméticos' },
        { name: 'Shampoo Masculino', price: 25.00, category: 'Produtos Capilares' },
    ],
    beauty_salon: [
        { name: 'Água Mineral 500ml', price: 3.00, category: 'Bebidas' },
        { name: 'Café', price: 5.00, category: 'Bebidas' },
        { name: 'Shampoo Profissional', price: 45.00, category: 'Produtos Capilares' },
        { name: 'Condicionador', price: 40.00, category: 'Produtos Capilares' },
        { name: 'Máscara Capilar', price: 60.00, category: 'Produtos Capilares' },
        { name: 'Esmalte', price: 15.00, category: 'Cosméticos' },
        { name: 'Óleo Capilar', price: 50.00, category: 'Produtos Capilares' },
    ],
};

export function getDefaultServices(type: BusinessType) {
    return DEFAULT_SERVICES[type] || DEFAULT_SERVICES.barbershop;
}

export function getDefaultProducts(type: BusinessType) {
    return DEFAULT_PRODUCTS[type] || DEFAULT_PRODUCTS.barbershop;
}
