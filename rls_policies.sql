-- RLS Policies for public.messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in users to read their messages in conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE
      public.conversations.id = messages.conversation_id
      AND (public.conversations.user1_id = auth.uid() OR public.conversations.user2_id = auth.uid())
  )
);

-- RLS Policies for public.conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage conversations they are a part of"
ON public.conversations FOR SELECT
TO authenticated
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- RLS Policies for public.bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view bookings they participate in"
ON public.bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE
      public.conversations.id = bookings.conversation_id
      AND (public.conversations.user1_id = auth.uid() OR public.conversations.user2_id = auth.uid())
  )
);

CREATE POLICY "Allow users to manage their bookings in conversations"
ON public.bookings FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE
      public.conversations.id = bookings.conversation_id
      AND (public.conversations.user1_id = auth.uid() OR public.conversations.user2_id = auth.uid())
  )
  AND (auth.uid() = customer_id OR auth.uid() = tutor_id)
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE
      public.conversations.id = bookings.conversation_id
      AND (public.conversations.user1_id = auth.uid() OR public.conversations.user2_id = auth.uid())
  )
  AND (auth.uid() = customer_id OR auth.uid() = tutor_id)
);
