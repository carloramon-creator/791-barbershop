# 2026-01-14 - Correções e Melhorias de Sistema

## Resumo das Alterações

### 1. Correção de Tooltips (Balões Amarelos)
- Corrigido problema onde os tooltips de ajuda não apareciam ou eram cortados em containers com `overflow: hidden` (como o Dashboard e Configurações).
- Implementado `TooltipPrimitive.Portal` no componente base de Tooltip para garantir que ele seja renderizado acima de todos os elementos.

### 2. Controle de Diagnóstico (SuperAdmin)
- Adicionado um botão de "Diagnóstico de Suporte" (ícone de alerta) na listagem de barbearias do SuperAdmin.
- Este botão permite que o suporte ative/desative o painel de ferramentas de diagnóstico para barbearias específicas.
- O painel de "Diagnóstico de Sistema" nas configurações da barbearia agora só é exibido se for ativado previamente pelo suporte no SuperAdmin.

### 3. Notificação de Atendimento (App Cliente)
- Revertido e melhorado o aviso de "CHEGOU SUA VEZ" no aplicativo do cliente.
- Agora, além da mudança visual no card, o navegador emitirá um `alert()` (e vibração em dispositivos compatíveis) assim que o status do cliente mudar de "Aguardando" para "Em Atendimento".
- Texto do aviso atualizado para ser mais direto e entusiasmado: "CHEGOU SUA VEZ!".

### 4. Correção de Erros de Lint (TypeScript)
- Corrigidos erros de variáveis não encontradas (`AlertTriangle`, `tenant`) e types em componentes modificados.

---
*Assinado: Antigravity Support*
