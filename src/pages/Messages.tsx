import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, ArrowLeft, Settings, MessageCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  other_user?: { full_name: string | null; avatar_url: string | null; store_name: string | null };
  last_message?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  is_auto_reply: boolean;
  created_at: string;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sellerId = searchParams.get('seller');

  // Fetch conversations
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

      // Fetch other user profiles
      const otherIds = data.map(c => c.buyer_id === user!.id ? c.seller_id : c.buyer_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, store_name')
        .in('id', otherIds);

      // Fetch last messages
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

  // Auto-open or create conversation from seller param
  useEffect(() => {
    if (sellerId && user && conversations.length >= 0) {
      const existing = conversations.find(c =>
        (c.buyer_id === user.id && c.seller_id === sellerId) ||
        (c.seller_id === user.id && c.buyer_id === sellerId)
      );
      if (existing) {
        setActiveConvo(existing.id);
      } else if (sellerId !== user.id) {
        // Create new conversation
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

  // Fetch messages for active conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', activeConvo],
    enabled: !!activeConvo,
    refetchInterval: 3000, // Poll every 3s
    queryFn: async (): Promise<Message[]> => {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', activeConvo!)
        .order('created_at', { ascending: true });

      // Mark unread as read
      if (data && user) {
        const unread = data.filter(m => !m.is_read && m.sender_id !== user.id);
        if (unread.length > 0) {
          await supabase.from('direct_messages')
            .update({ is_read: true })
            .in('id', unread.map(m => m.id));
        }
      }
      return data || [];
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !activeConvo) throw new Error('Missing context');
      const { error } = await supabase.from('direct_messages').insert({
        conversation_id: activeConvo,
        sender_id: user.id,
        content,
      });
      if (error) throw error;

      // Update conversation timestamp
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeConvo);

      // Check for auto-reply
      const convo = conversations.find(c => c.id === activeConvo);
      if (convo) {
        const otherUserId = convo.buyer_id === user.id ? convo.seller_id : convo.buyer_id;
        const { data: autoReply } = await supabase
          .from('seller_auto_replies')
          .select('*')
          .eq('seller_id', otherUserId)
          .single();

        if (autoReply?.is_enabled) {
          const replyText = autoReply.is_away ? autoReply.away_message : autoReply.greeting_message;
          setTimeout(async () => {
            await supabase.from('direct_messages').insert({
              conversation_id: activeConvo,
              sender_id: otherUserId,
              content: replyText || "Thanks for your message!",
              is_auto_reply: true,
            });
            queryClient.invalidateQueries({ queryKey: ['messages', activeConvo] });
          }, (autoReply.response_delay_seconds || 3) * 1000);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConvo] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageText('');
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMutation.mutate(messageText);
  };

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
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {!activeConvo ? (
          /* Inbox List */
          <div className="flex-1">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h1 className="text-lg font-bold text-foreground">Messages</h1>
              <Button variant="ghost" size="sm" onClick={() => navigate('/seller')} className="text-xs gap-1">
                <Settings className="h-3 w-3" /> Auto-Reply Settings
              </Button>
            </div>
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-3" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start a conversation from the Feed!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map(convo => (
                  <button
                    key={convo.id}
                    onClick={() => setActiveConvo(convo.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={convo.other_user?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {(convo.other_user?.full_name || 'U')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {convo.other_user?.store_name || convo.other_user?.full_name || 'User'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(convo.last_message_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">{convo.last_message || 'No messages yet'}</p>
                        {(convo.unread_count || 0) > 0 && (
                          <span className="bg-primary text-primary-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
                            {convo.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Chat Room */
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-3 border-b border-border">
              <Button variant="ghost" size="icon" onClick={() => setActiveConvo(null)} className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9 border border-primary/30">
                <AvatarImage src={activeConversation?.other_user?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {(activeConversation?.other_user?.full_name || 'U')[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {activeConversation?.other_user?.store_name || activeConversation?.other_user?.full_name || 'User'}
                </p>
                <p className="text-[10px] text-neon-emerald flex items-center gap-1">
                  <Circle className="h-2 w-2 fill-current" /> Online
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 pb-4">
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      msg.sender_id === user.id
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-secondary text-foreground rounded-bl-sm'
                    }`}>
                      {msg.content}
                      <div className={`flex items-center gap-1 mt-1 ${msg.sender_id === user.id ? 'justify-end' : ''}`}>
                        {msg.is_auto_reply && <span className="text-[9px] opacity-60">🤖 Auto</span>}
                        <span className={`text-[10px] ${msg.sender_id === user.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-secondary border-border/50"
                />
                <Button type="submit" size="icon" className="shrink-0" disabled={!messageText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
};

export default Messages;
