import { useState, useEffect, useRef } from 'react';
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
import { toast } from 'sonner';

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  other_user?: { full_name: string | null; avatar_url: string | null; store_name: string | null };
  last_message?: string;
  unread_count?: number;
}

interface DiscoverProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  store_name: string | null;
  bio: string | null;
  is_seller: boolean | null;
  seller_application_approved: boolean | null;
  seller_verified: boolean | null;
  followers_count: number | null;
  total_sales: number | null;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const sellerId = searchParams.get('seller');
  const handledSellerParamRef = useRef<string | null>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Conversation[]> => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order('last_message_at', { ascending: false });

      if (!data || data.length === 0) return [];

      const otherIds = data.map((c) => (c.buyer_id === user!.id ? c.seller_id : c.buyer_id));
      const convoIds = data.map((c) => c.id);

      const [{ data: profiles }, { data: messages }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, store_name')
          .in('id', otherIds),
        supabase
          .from('direct_messages')
          .select('conversation_id, content, is_read, sender_id, created_at')
          .in('conversation_id', convoIds)
          .order('created_at', { ascending: false }),
      ]);

      return data.map((c) => {
        const otherId = c.buyer_id === user!.id ? c.seller_id : c.buyer_id;
        const profile = profiles?.find((p) => p.id === otherId);
        const lastMsg = messages?.find((m) => m.conversation_id === c.id);
        const unread = messages?.filter((m) => m.conversation_id === c.id && !m.is_read && m.sender_id !== user!.id).length || 0;

        return {
          ...c,
          other_user: profile || { full_name: 'User', avatar_url: null, store_name: null },
          last_message: lastMsg?.content,
          unread_count: unread,
        };
      });
    },
  });

  const { data: topSellers = [] } = useQuery({
    queryKey: ['message-top-sellers', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<DiscoverProfile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, store_name, bio, is_seller, seller_application_approved, seller_verified, followers_count, total_sales')
        .neq('id', user!.id)
        .order('followers_count', { ascending: false })
        .limit(18);

      if (error) throw error;

      return (data || [])
        .filter((profile) => profile.is_seller || profile.seller_application_approved || profile.store_name)
        .sort((a, b) => {
          const scoreA = Number(a.followers_count || 0) + Number(a.total_sales || 0) * 2 + (a.seller_verified ? 500 : 0);
          const scoreB = Number(b.followers_count || 0) + Number(b.total_sales || 0) * 2 + (b.seller_verified ? 500 : 0);
          return scoreB - scoreA;
        })
        .slice(0, 10);
    },
  });

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['message-search-profiles', user?.id, searchQuery],
    enabled: !!user && searchQuery.trim().length > 0,
    queryFn: async (): Promise<DiscoverProfile[]> => {
      const term = searchQuery.trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, store_name, bio, is_seller, seller_application_approved, seller_verified, followers_count, total_sales')
        .neq('id', user!.id)
        .or(`full_name.ilike.%${term}%,store_name.ilike.%${term}%`)
        .order('followers_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const openConversation = async (targetUserId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (targetUserId === user.id) {
      toast.error("You can't message yourself");
      return;
    }

    const existing = conversations.find(
      (conversation) =>
        (conversation.buyer_id === user.id && conversation.seller_id === targetUserId) ||
        (conversation.seller_id === user.id && conversation.buyer_id === targetUserId)
    );

    if (existing) {
      setActiveConvo(existing.id);
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({ buyer_id: user.id, seller_id: targetUserId })
      .select()
      .single();

    if (error) {
      toast.error('Unable to start chat right now');
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
    setActiveConvo(data.id);
  };

  useEffect(() => {
    if (!sellerId || !user || loadingConversations) return;
    if (handledSellerParamRef.current === sellerId) return;

    handledSellerParamRef.current = sellerId;
    void openConversation(sellerId);
  }, [sellerId, user, loadingConversations, conversations]);

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

  const activeConversation = conversations.find((c) => c.id === activeConvo);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full min-h-0">
        {!activeConvo || !activeConversation ? (
          <ConversationList
            conversations={conversations}
            onSelect={setActiveConvo}
            topSellers={topSellers}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            onStartConversation={(userId) => void openConversation(userId)}
            isSearching={searching}
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
