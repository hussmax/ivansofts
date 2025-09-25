-- Create message_reactions table
CREATE TABLE public.message_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_reactions_pkey PRIMARY KEY (id),
    CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
    CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT unique_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

-- Enable Row Level Security (RLS) for message_reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policy for all users to read message reactions
CREATE POLICY "Allow all users to read message reactions"
ON public.message_reactions FOR SELECT
USING (true);

-- Policy for authenticated users to insert their own message reactions
CREATE POLICY "Allow authenticated users to insert their own message reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users to delete their own message reactions
CREATE POLICY "Allow authenticated users to delete their own message reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);