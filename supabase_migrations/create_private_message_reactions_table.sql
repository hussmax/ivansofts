-- Create private_message_reactions table
CREATE TABLE public.private_message_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT private_message_reactions_pkey PRIMARY KEY (id),
    CONSTRAINT private_message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.private_messages(id) ON DELETE CASCADE,
    CONSTRAINT private_message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT unique_private_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

-- Enable Row Level Security (RLS) for private_message_reactions
ALTER TABLE public.private_message_reactions ENABLE ROW LEVEL SECURITY;

-- Policy for users to read private message reactions if they are part of the conversation
CREATE POLICY "Allow users to read private message reactions if they are part of the conversation"
ON public.private_message_reactions FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.private_messages
        WHERE
            private_messages.id = message_id AND (
                private_messages.sender_id = auth.uid() OR
                private_messages.receiver_id = auth.uid()
            )
    )
);

-- Policy for authenticated users to insert their own private message reactions
CREATE POLICY "Allow authenticated users to insert their own private message reactions"
ON public.private_message_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users to delete their own private message reactions
CREATE POLICY "Allow authenticated users to delete their own private message reactions"
ON public.private_message_reactions FOR DELETE
USING (auth.uid() = user_id);