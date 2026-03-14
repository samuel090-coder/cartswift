import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import ConversationList from '@/components/chat/ConversationList';
import ChatRoom from '@/components/chat/ChatRoom';

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  other_user?: { full_name: string | null; avatar_url: string | null; store_name: string | null };
  last_message?: string;
  unread_count?: number;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const sellerId = searchParams.get('seller');

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Conversation[]> => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order('last_message_at', { ascending: false });

      if (!data) return [];

      const otherIds = data.map(c => c.buyer_id === user!.id ? c.seller_id : c.buyer_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, store_name')
        .in('id', otherIds);

      const convoIds = data.map(c => c.id);
      const { data: messages } = await supabase
        .from('direct_messages')
        .select('conversation_id, content, is_read, sender_id')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false });

      return data.map(c => {
        const otherId = c.buyer_id === user!.id ? c.seller_id : c.buyer_id;
        const profile = profiles?.find(p => p.id === otherId);
        const lastMsg = messages?.find(m => m.conversation_id === c.id);
        const unread = messages?.filter(m => m.conversation_id === c.id && !m.is_read && m.sender_id !== user!.id).length || 0;
        return {
          ...c,
          other_user: profile || { full_name: 'User', avatar_url: null, store_name: null },
          last_message: lastMsg?.content,
          unread_count: unread,
        };
      });
    },
  });

  useEffect(() => {
    if (sellerId && user && conversations.length >= 0) {
      const existing = conversations.find(c =>
        (c.buyer_id === user.id && c.seller_id === sellerId) ||
        (c.seller_id === user.id && c.buyer_id === sellerId)
      );
      if (existing) {
        setActiveConvo(existing.id);
      } else if (sellerId !== user.id) {
        supabase.from('conversations').insert({ buyer_id: user.id, seller_id: sellerId })
          .select().single().then(({ data }) => {
            if (data) {
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              setActiveConvo(data.id);
            }
          });
      }
    }
  }, [sellerId, user, conversations]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Sign in to view messages</h2>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const activeConversation = conversations.find(c => c.id === activeConvo);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full min-h-0">
        {!activeConvo || !activeConversation ? (
          <ConversationList
            conversations={conversations}
            onSelect={setActiveConvo}
          />
        ) : (
          <ChatRoom
            conversation={activeConversation}
            onBack={() => setActiveConvo(null)}
          />
        )}
      </div>
      {!activeConvo && <BottomNavigation />}
    </div>
  );
};

export default Messages;
