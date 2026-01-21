-- 1. FIX SUPPORT TICKETS (Missing Join Relationship)
ALTER TABLE support_tickets
DROP CONSTRAINT IF EXISTS fk_support_tickets_user;

ALTER TABLE support_tickets
ADD CONSTRAINT fk_support_tickets_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 2. FIX BARBERS (Duplicate Profiles / Upsert Issues)
-- Remove duplicates keeping only the most recent for each (tenant, user)
DELETE FROM barbers a USING (
      SELECT MIN(ctid) as ctid, tenant_id, user_id
      FROM barbers 
      GROUP BY tenant_id, user_id 
      HAVING COUNT(*) > 1
) b
WHERE a.tenant_id = b.tenant_id 
AND a.user_id = b.user_id 
AND a.ctid <> b.ctid;

-- Ensure the Unique constraint exists for the Upsert to work safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'barbers_tenant_id_user_id_key') THEN
        ALTER TABLE barbers
        ADD CONSTRAINT barbers_tenant_id_user_id_key UNIQUE (tenant_id, user_id);
    END IF;
END $$;
