-- Create support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL, -- bug, feature, finance, question
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, progress, closed
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID,
    context JSONB, -- { userAgent, currentUrl, userName, etc. }
    resolved_at TIMESTAMPTZ,
    admin_notes TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies for security
-- Note: In this system, we'll use a service role for the API, 
-- but we enable owners to see their own tickets if they ever access via client side.

DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
CREATE POLICY "Users can view their own tickets" ON support_tickets
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM users u WHERE u.tenant_id = support_tickets.tenant_id AND u.id = auth.uid() AND u.role = 'owner'
    ));

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT TO authenticated
    WITH CHECK (true);
