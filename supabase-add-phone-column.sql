-- Add phone column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN phone TEXT;
    
    COMMENT ON COLUMN profiles.phone IS 'Customer phone number (optional)';
  END IF;
END $$;


