// Módulos do sistema exclusivos do 791glass
export const GLASS_MODULES = [
    { id: 'dashboard', label: 'Visão Geral' },
    { id: 'pessoas', label: 'Pessoas', basic: true },
    { id: 'orcamentos', label: 'Orçamentos', basic: true },
    { id: 'materiais', label: 'Materiais', basic: true },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'crm', label: 'CRM' },
    { id: 'ordens_servico', label: 'Ordens de Serviço' },
    { id: 'producao', label: 'Produção' },
    // Financeiro (submenus)
    { id: 'financeiro.visao_geral', label: 'Financeiro > Visão Geral' },
    { id: 'financeiro.contas_correntes', label: 'Financeiro > Contas Correntes' },
    { id: 'financeiro.plano_contas', label: 'Financeiro > Plano de Contas' },
    { id: 'financeiro.lancamentos', label: 'Financeiro > Lançamentos' },
    { id: 'financeiro.comissoes_pagar', label: 'Financeiro > Comissões a Pagar' },
    { id: 'financeiro.contas_receber', label: 'Financeiro > Contas a Receber' },
    { id: 'financeiro.contas_pagar', label: 'Financeiro > Contas a Pagar' },
    { id: 'financeiro.fluxo_caixa', label: 'Financeiro > Fluxo de Caixa' },
    { id: 'financeiro.fluxo_contas', label: 'Financeiro > Fluxo de Contas' },
    { id: 'financeiro.conciliacao_bancaria', label: 'Financeiro > Conciliação Bancária' },
    { id: 'financeiro.cobrancas_boletos', label: 'Financeiro > Cobranças e Boletos' },
    { id: 'financeiro.links_pagamento', label: 'Financeiro > Links de Pagamento' },
    { id: 'financeiro.integracoes_bancarias', label: 'Financeiro > Integrações Bancárias' },
    { id: 'financeiro.dre', label: 'Financeiro > DRE' },
    { id: 'financeiro.balancete', label: 'Financeiro > Balancete' },
    { id: 'financeiro.ia_financeira', label: 'Financeiro > IA Financeira' },
    // Configurações (submenus)
    { id: 'configuracoes.dados_empresa', label: 'Configurações > Dados da Empresa', basic: true },
    { id: 'configuracoes.geral', label: 'Configurações > Geral' },
    { id: 'configuracoes.etapas_producao', label: 'Configurações > Etapas de Produção' },
    { id: 'configuracoes.fiscais', label: 'Configurações > Fiscais' },
    { id: 'configuracoes.formas_pagamento', label: 'Configurações > Formas de Pagamento' },
    { id: 'configuracoes.modelos_projetos', label: 'Configurações > Modelos de Projetos', basic: true },
    { id: 'configuracoes.permissoes', label: 'Configurações > Permissões', basic: true },
    { id: 'configuracoes.logs', label: 'Configurações > Logs', basic: true },
];

export const GLASS_BASIC_MODULES = GLASS_MODULES.filter(m => m.basic).map(m => m.id);
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
