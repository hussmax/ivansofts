-- Add is_edited column to messages table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='is_edited') THEN
        ALTER TABLE public.messages ADD COLUMN is_edited boolean DEFAULT false NOT NULL;
    END IF;
END
$$;

-- Add edited_at column to messages table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='edited_at') THEN
        ALTER TABLE public.messages ADD COLUMN edited_at timestamp with time zone;
    END IF;
END
$$;

-- Update RLS policies for messages table to allow reading new columns
-- Ensure existing RLS policies for 'messages' table allow SELECT on 'is_edited' and 'edited_at'.
-- If you have a policy like "Allow all users to read messages", it should already cover this.
-- If not, you might need to adjust your SELECT policy for the 'messages' table.