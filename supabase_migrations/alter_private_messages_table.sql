-- Add is_edited column to private_messages table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='private_messages' AND column_name='is_edited') THEN
        ALTER TABLE public.private_messages ADD COLUMN is_edited boolean DEFAULT false NOT NULL;
    END IF;
END
$$;

-- Add edited_at column to private_messages table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='private_messages' AND column_name='edited_at') THEN
        ALTER TABLE public.private_messages ADD COLUMN edited_at timestamp with time zone;
    END IF;
END
$$;

-- Update RLS policies for private_messages table to allow reading new columns
-- Ensure existing RLS policies for 'private_messages' table allow SELECT on 'is_edited' and 'edited_at'.
-- If you have a policy like "Allow users to read private messages if they are part of the conversation", it should already cover this.
-- If not, you might need to adjust your SELECT policy for the 'private_messages' table.