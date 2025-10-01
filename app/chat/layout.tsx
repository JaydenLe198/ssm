'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getConversations, getUserProfileById } from '@/app/chat/actions';
import Link from 'next/link';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { SelectConversation } from '@/utils/db/schema';

type ConversationWithOtherUserName = SelectConversation & { otherUserName: string };

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [conversations, setConversations] = useState<ConversationWithOtherUserName[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const segment = useSelectedLayoutSegment(); // Get the currently active segment (conversationId)

  useEffect(() => {
    const fetchConversations = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUserId(user.id);

      const { conversations: fetchedConversations, error } =
        await getConversations(user.id);
      if (error) {
        console.error('Error fetching conversations:', error);
      } else if (fetchedConversations) {
        const conversationsWithNames = await Promise.all(
          fetchedConversations.map(async (conv) => {
            const otherUserId =
              conv.user1Id === user.id ? conv.user2Id : conv.user1Id;
            const { profile, error: profileError } = await getUserProfileById(
              otherUserId
            );
            if (profileError) {
              console.error('Error fetching profile for conversation:', profileError);
              return { ...conv, otherUserName: 'Unknown User' };
            }
            return {
              ...conv,
              otherUserName: `${profile?.first_name} ${profile?.last_name}`,
            };
          })
        );
        setConversations(conversationsWithNames);
      }
      setLoading(false);
    };

    fetchConversations();

    const channel = supabase
      .channel('conversations_list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user1_id=eq.${currentUserId}`,
        },
        (payload) => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user2_id=eq.${currentUserId}`,
        },
        (payload) => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, router, supabase]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <p>Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left sidebar for conversations list */}
      <div className="w-1/4 border-r bg-gray-50 overflow-y-auto">
        <h2 className="text-xl font-bold p-4 border-b">Conversations</h2>
        <div className="space-y-2 p-2">
          {conversations.map((conv) => (
            <Link href={`/chat/${conv.id}`} key={conv.id}>
              <Card
                className={`hover:bg-gray-100 ${
                  segment === conv.id ? 'bg-blue-100 border-blue-500' : ''
                }`}
              >
                <CardContent className="p-3">
                  <p className="font-semibold">{conv.otherUserName}</p>
                  <p className="text-sm text-gray-500">
                    Last updated:{' '}
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Right section for chat messages */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
