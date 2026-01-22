-- Add admin_permissions column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS admin_permissions JSONB DEFAULT '["all"]'::jsonb;

-- Update existing admins to have "all" permissions (backward compatibility)
UPDATE users 
SET admin_permissions = '["all"]' 
WHERE is_system_admin = true AND (admin_permissions IS NULL OR admin_permissions = '[]');

-- Comment on column
COMMENT ON COLUMN users.admin_permissions IS 'Array of permission strings: ["all", "manage_tenants", "manage_finance", "manage_plans", "manage_coupons", "manage_settings", "manage_support", "manage_admins"]';
