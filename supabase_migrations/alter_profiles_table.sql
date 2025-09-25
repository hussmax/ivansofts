-- Add display_name column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='display_name') THEN
        ALTER TABLE public.profiles ADD COLUMN display_name text;
    END IF;
END
$$;

-- Add avatar_url column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url text;
    END IF;
END
$$;

-- Update RLS policies for profiles table to allow reading new columns
-- Ensure existing RLS policies for 'profiles' table allow SELECT on 'display_name' and 'avatar_url'.
-- If you have a policy like "Allow all users to read profiles", it should already cover this.
-- If not, you might need to adjust your SELECT policy for the 'profiles' table.
-- Example (if you need to create a basic read policy):
-- CREATE POLICY "Allow all users to read profiles" ON public.profiles FOR SELECT USING (true);