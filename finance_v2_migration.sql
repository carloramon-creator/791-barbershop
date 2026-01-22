-- Add parent_id to holding_categories for subcategories
ALTER TABLE holding_categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES holding_categories(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_holding_categories_parent_id ON holding_categories(parent_id);
