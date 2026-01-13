-- Adiciona coluna stripe_price_id para integração com Stripe
-- Esta coluna armazena o ID do Price criado no Stripe para cada add-on

ALTER TABLE public.system_addons 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

COMMENT ON COLUMN public.system_addons.stripe_price_id IS 'ID do Price no Stripe para cobrança recorrente do add-on';

-- Atualizar add-ons existentes com Price IDs (você precisará criar esses prices no Stripe Dashboard primeiro)
-- Exemplo:
-- UPDATE public.system_addons SET stripe_price_id = 'price_xxxxx' WHERE slug = 'inventory';
-- UPDATE public.system_addons SET stripe_price_id = 'price_yyyyy' WHERE slug = 'finance_module';
