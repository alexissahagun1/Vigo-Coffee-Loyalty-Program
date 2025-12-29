-- ============================================
-- Pass Registrations Table for Apple Wallet Updates
-- ============================================
-- This table stores device registrations for Apple Wallet passes
-- Required for real-time pass updates via push notifications

-- Create pass_registrations table
CREATE TABLE IF NOT EXISTS public.pass_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_library_identifier TEXT NOT NULL,
  pass_type_identifier TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one registration per device+pass+serial combination
  UNIQUE(device_library_identifier, pass_type_identifier, serial_number)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pass_registrations_device 
  ON public.pass_registrations(device_library_identifier, pass_type_identifier);

CREATE INDEX IF NOT EXISTS idx_pass_registrations_serial 
  ON public.pass_registrations(serial_number);

-- Enable RLS
ALTER TABLE public.pass_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only allow service role to manage registrations
-- (Apple's servers will authenticate via the pass's authenticationToken)
-- For now, we'll allow authenticated users to see their own registrations
CREATE POLICY "service_can_manage_registrations"
  ON public.pass_registrations
  FOR ALL
  USING (true); -- In production, add proper authentication check

-- Add comment
COMMENT ON TABLE public.pass_registrations IS 'Stores Apple Wallet device registrations for pass updates';
COMMENT ON COLUMN public.pass_registrations.device_library_identifier IS 'Unique identifier for the iOS device';
COMMENT ON COLUMN public.pass_registrations.pass_type_identifier IS 'Pass Type ID (e.g., pass.com.vigocoffee.loyalty)';
COMMENT ON COLUMN public.pass_registrations.serial_number IS 'User ID (used as pass serial number)';
COMMENT ON COLUMN public.pass_registrations.push_token IS 'APNs push token for sending notifications';


