-- Ensure barbers table has a unique constraint on (tenant_id, user_id) 
-- to allow the upsert in the users/route.ts to work correctly.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'barbers_tenant_id_user_id_key'
    ) THEN
        ALTER TABLE barbers
        ADD CONSTRAINT barbers_tenant_id_user_id_key UNIQUE (tenant_id, user_id);
    END IF;
END $$;
