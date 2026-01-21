-- Add missing foreign keys to support_tickets to allow Joins in API
ALTER TABLE support_tickets
ADD CONSTRAINT fk_support_tickets_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Ensure tenants relationship is explicit (should be already, but just in case)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_tenant_id_fkey') THEN
        ALTER TABLE support_tickets
        ADD CONSTRAINT support_tickets_tenant_id_fkey
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
