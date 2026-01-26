# Guia: Customizar Fatura do Asaas (Ocultar Endereço)

## Acesso
1. Entre em: https://sandbox.asaas.com (ou https://www.asaas.com se for produção)
2. Login com suas credenciais

## Passo a Passo

### 1. Ir para Configurações de Personalização
- Menu lateral → **Configurações** (ícone de engrenagem)
- Clique em **"Personalização de cobranças"** ou **"Checkout e Faturas"**

### 2. Upload da Logo
- Procure a seção **"Logo da empresa"**
- Faça upload do arquivo: `/public/logo-791.jpg`
- Tamanho recomendado: 200x200px

### 3. Informações Comerciais
- Procure a seção **"Informações da empresa"** ou **"Dados comerciais"**
- **Email:** Altere para `contato@791solucoes.com.br`
- **Telefone:** (48) 3333-3379
- **Celular:** (48) 99180-3379

### 4. Ocultar Endereço Completo
- Procure a opção **"Exibir endereço completo na fatura"** ou similar
- **DESMARQUE** esta opção
- Ou procure por **"Informações exibidas na fatura"**
- Mantenha apenas: **Cidade/Estado** (São José/SC)

### 5. Cores (Opcional)
- **Cor primária:** #1e40af (Azul)
- **Cor secundária:** #f59e0b (Laranja)

### 6. Observações/Rodapé
No campo de observações ou mensagem personalizada, adicione:
```
791 Soluções Empresariais LTDA
São José/SC
contato@791solucoes.com.br | (48) 3333-3379
```

### 7. Salvar
- Clique em **"Salvar"** ou **"Atualizar"**
- Teste gerando uma nova cobrança para ver como ficou

## Resultado Esperado
✅ Logo da 791 Soluções no topo
✅ Email: contato@791solucoes.com.br
✅ Endereço: Apenas "São José/SC"
❌ Sem rua, número, CEP, bairro

---

**Nota:** Se não encontrar a opção de ocultar endereço, entre em contato com o suporte do Asaas pelo chat. Eles liberam essa configuração rapidamente.
