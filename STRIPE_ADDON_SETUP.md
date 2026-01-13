# Guia: Configuração de Add-ons no Stripe

## 📋 Pré-requisitos
- Acesso ao [Stripe Dashboard](https://dashboard.stripe.com)
- Acesso ao banco de dados Supabase

## 🎯 Objetivo
Configurar os Price IDs no Stripe para que os add-ons sejam cobrados automaticamente nas subscriptions.

## 📝 Passo a Passo

### 1. Rodar a Migration SQL
Execute o arquivo `addon_stripe_price_migration.sql` no Supabase SQL Editor:

```sql
ALTER TABLE public.system_addons 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
```

### 2. Criar Produtos no Stripe Dashboard

1. Acesse: https://dashboard.stripe.com/products
2. Clique em **"+ Add product"**
3. Para cada add-on, crie um produto:

#### Add-on: Módulo Financeiro
- **Name**: `Módulo Financeiro - 791 Barber`
- **Description**: `Controle de caixa, despesas e faturamento`
- **Pricing model**: `Recurring`
- **Price**: `R$ 20,00`
- **Billing period**: `Monthly`
- Clique em **"Save product"**
- **COPIE O PRICE ID** (formato: `price_xxxxxxxxxxxxx`)

#### Add-on: Módulo Estoque
- **Name**: `Módulo Estoque - 791 Barber`
- **Description**: `Gestão de estoque e suprimentos`
- **Pricing model**: `Recurring`
- **Price**: `R$ 30,00`
- **Billing period**: `Monthly`
- Clique em **"Save product"**
- **COPIE O PRICE ID** (formato: `price_yyyyyyyyyyyyy`)

### 3. Atualizar o Banco de Dados

Execute no Supabase SQL Editor:

```sql
-- Atualizar Módulo Financeiro
UPDATE public.system_addons 
SET stripe_price_id = 'price_xxxxxxxxxxxxx'  -- SUBSTITUA pelo Price ID real
WHERE slug = 'finance_module';

-- Atualizar Módulo Estoque
UPDATE public.system_addons 
SET stripe_price_id = 'price_yyyyyyyyyyyyy'  -- SUBSTITUA pelo Price ID real
WHERE slug = 'inventory';
```

### 4. Verificar Configuração

Execute para confirmar:

```sql
SELECT slug, name, price, stripe_price_id 
FROM public.system_addons;
```

## ✅ Como Funciona Agora

Quando um cliente ativa um add-on:

1. **Frontend** chama `/api/barbershop/addons/activate`
2. **Backend** cria um `subscription_item` no Stripe usando o `stripe_price_id`
3. **Stripe** adiciona o add-on à subscription existente
4. **Cobrança** é feita automaticamente de forma **pro-rata** (proporcional ao período restante)
5. **Sidebar** atualiza automaticamente com o novo módulo

## 🔍 Logs para Monitorar

Verifique os logs do Railway para confirmar:
- `[ADDON ACTIVATE] Stripe item criado: si_xxxxx`
- `[ADDON ACTIVATE] finance_module ativado para [Tenant]`

## ⚠️ Importante

- Se o add-on **NÃO** tiver `stripe_price_id` configurado, ele será ativado no sistema mas **não será cobrado automaticamente**
- Você verá o aviso: `"Add-on ativado! Cobrança manual necessária."`
