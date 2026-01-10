-- Create barber_services table for Many-to-Many relationship
CREATE TABLE IF NOT EXISTS public.barber_services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    barber_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- Assuming 'users' table holds barbers
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(barber_id, service_id)
);

-- RLS Policies
ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (public catalog needs to know who does what)
CREATE POLICY "Allow public read access" ON public.barber_services
    FOR SELECT USING (true);

-- Allow authenticated users (owners/staff) to modify
CREATE POLICY "Allow authenticated modification" ON public.barber_services
    FOR ALL USING (auth.role() = 'authenticated');
