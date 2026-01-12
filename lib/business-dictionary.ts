export type BusinessType = 'barbershop' | 'beauty_salon';

export const BUSINESS_TEXTS = {
    barbershop: {
        // Terminologia
        professional: 'Barbeiro',
        professionals: 'Barbeiros',
        client: 'Cliente',
        clients: 'Clientes',
        service: 'Serviço',
        services: 'Serviços',

        // Ações
        enterQueue: 'Entrar na Fila',
        makeAppointment: 'Agendar Horário',

        // Descrições
        welcomeMessage: 'Bem-vindo à sua barbearia!',
        queueDescription: 'Entre na fila agora mesmo.',
        appointmentDescription: 'Reserve seu horário favorito.',
    },
    beauty_salon: {
        // Terminologia
        professional: 'Profissional',
        professionals: 'Profissionais',
        client: 'Cliente',
        clients: 'Clientes',
        service: 'Serviço',
        services: 'Serviços',

        // Ações
        enterQueue: 'Entrar na Fila',
        makeAppointment: 'Agendar Horário',

        // Descrições
        welcomeMessage: 'Bem-vinda ao seu salão de beleza!',
        queueDescription: 'Entre na fila de atendimento.',
        appointmentDescription: 'Agende seu horário de beleza.',
    }
};

export function getBusinessTexts(type: BusinessType = 'barbershop') {
    return BUSINESS_TEXTS[type] || BUSINESS_TEXTS.barbershop;
}
