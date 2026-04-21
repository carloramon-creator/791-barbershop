// Módulos do sistema compartilhados entre barbearias e vidraçarias
export const ALL_MODULES = [
    { id: "dashboard", label: "Visão Geral" },
    { id: "pessoas", label: "Pessoas" },
    { id: "orcamentos", label: "Orçamentos" },
    { id: "materiais", label: "Materiais" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "crm", label: "CRM" },
    { id: "ordens_servico", label: "Ordens de Serviço" },
    { id: "producao", label: "Produção" },
    { id: "financeiro", label: "Financeiro" },
    { id: "estoque", label: "Estoque" },
    { id: "vendas", label: "Vendas" },
    { id: "relatorios", label: "Relatórios" },
    { id: "configuracoes.dados_empresa", label: "Configurações > Dados da Empresa" },
    { id: "configuracoes.modelos_projetos", label: "Configurações > Modelos de Projetos" },
    { id: "configuracoes.permissoes", label: "Configurações > Permissões" },
    { id: "configuracoes.logs", label: "Configurações > Logs" },
];

export const BASIC_MODULES = [
    "pessoas",
    "orcamentos",
    "materiais",
    "configuracoes.dados_empresa",
    "configuracoes.modelos_projetos",
    "configuracoes.permissoes",
    "configuracoes.logs"
];
