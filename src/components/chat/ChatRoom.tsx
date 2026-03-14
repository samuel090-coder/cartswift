import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  other_user?: { full_name: string | null; avatar_url: string | null; store_name: string | null };
}

interface ChatRoomProps {
  conversation: Conversation;
  onBack: () => void;
}

const ChatRoom = ({ conversation, onBack }: ChatRoomProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversation.id],
    enabled: !!conversation.id,
    refetchInterval: 3000,
    queryFn: async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

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

  // Fetch tagged products for messages
  const taggedItemIds = messages.filter(m => (m as any).tagged_product_id).map(m => (m as any).tagged_product_id);
  const taggedSellerIds = messages.filter(m => (m as any).tagged_seller_product_id).map(m => (m as any).tagged_seller_product_id);

  const { data: taggedItems } = useQuery({
    queryKey: ['tagged-items', taggedItemIds],
    enabled: taggedItemIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('items').select('id, title, images, price, currency').in('id', taggedItemIds);
      return data || [];
    },
  });

  const { data: taggedSellerProducts } = useQuery({
    queryKey: ['tagged-seller-products', taggedSellerIds],
    enabled: taggedSellerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('seller_products').select('id, title, images, price, currency').in('id', taggedSellerIds);
      return data || [];
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  const sendMutation = useMutation({
    mutationFn: async (payload: {
      content: string;
      message_type: string;
      file_url?: string;
      file_name?: string;
      file_size?: number;
      mime_type?: string;
      voice_duration?: number;
      tagged_product_id?: string;
      tagged_seller_product_id?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('direct_messages').insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: payload.content,
        message_type: payload.message_type,
        file_url: payload.file_url,
        file_name: payload.file_name,
        file_size: payload.file_size,
        mime_type: payload.mime_type,
        voice_duration: payload.voice_duration,
        tagged_product_id: payload.tagged_product_id,
        tagged_seller_product_id: payload.tagged_seller_product_id,
      } as any);
      if (error) throw error;

      await supabase.from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);

      // Auto-reply logic
      const otherUserId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
      const { data: autoReply } = await supabase
        .from('seller_auto_replies')
        .select('*')
        .eq('seller_id', otherUserId)
        .single();

      if (autoReply?.is_enabled) {
        const replyText = autoReply.is_away ? autoReply.away_message : autoReply.greeting_message;
        setTimeout(async () => {
          await supabase.from('direct_messages').insert({
            conversation_id: conversation.id,
            sender_id: otherUserId,
            content: replyText || "Thanks for your message!",
            is_auto_reply: true,
            message_type: 'text',
          } as any);
          queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
        }, (autoReply.response_delay_seconds || 3) * 1000);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const uploadFile = async (file: File, folder: string): Promise<{ url: string; name: string; size: number; mime: string }> => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-media').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name, size: file.size, mime: file.type };
  };

  const handleSendText = (text: string, taggedProduct?: any) => {
    sendMutation.mutate({
      content: text,
      message_type: 'text',
      tagged_product_id: taggedProduct?.source === 'item' ? taggedProduct.id : undefined,
      tagged_seller_product_id: taggedProduct?.source === 'seller_product' ? taggedProduct.id : undefined,
    });
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
    const uploaded = await uploadFile(file, 'voice');
    sendMutation.mutate({
      content: '',
      message_type: 'voice',
      file_url: uploaded.url,
      file_name: uploaded.name,
      file_size: uploaded.size,
      mime_type: uploaded.mime,
      voice_duration: duration,
    });
  };

  const handleSendFile = async (file: File) => {
    const uploaded = await uploadFile(file, 'files');
    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';

    sendMutation.mutate({
      content: '',
      message_type: type,
      file_url: uploaded.url,
      file_name: uploaded.name,
      file_size: uploaded.size,
      mime_type: uploaded.mime,
    });
  };

  const getTaggedProduct = (msg: any) => {
    if (msg.tagged_product_id) {
      const item = taggedItems?.find(i => i.id === msg.tagged_product_id);
      if (item) return { id: item.id, title: item.title, image: item.images?.[0], price: item.price, currency: item.currency };
    }
    if (msg.tagged_seller_product_id) {
      const sp = taggedSellerProducts?.find(p => p.id === msg.tagged_seller_product_id);
      if (sp) return { id: sp.id, title: sp.title, image: sp.images?.[0], price: sp.price, currency: sp.currency };
    }
    return null;
  };

  const displayName = conversation.other_user?.store_name || conversation.other_user?.full_name || 'User';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9 border border-primary/30">
          <AvatarImage src={conversation.other_user?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {displayName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          <p className="text-[10px] text-emerald-500 flex items-center gap-1">
            <Circle className="h-2 w-2 fill-current" /> Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3 pb-4">
          {messages.map(msg => (
            <ChatBubble
              key={msg.id}
              content={msg.content}
              messageType={(msg as any).message_type || 'text'}
              fileUrl={(msg as any).file_url}
              fileName={(msg as any).file_name}
              fileSize={(msg as any).file_size}
              mimeType={(msg as any).mime_type}
              voiceDuration={(msg as any).voice_duration}
              taggedProduct={getTaggedProduct(msg)}
              isMine={msg.sender_id === user?.id}
              isAutoReply={msg.is_auto_reply}
              timestamp={msg.created_at}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSendText={handleSendText}
        onSendVoice={handleSendVoice}
        onSendFile={handleSendFile}
        disabled={sendMutation.isPending}
        userId={user?.id || ''}
      />
    </div>
  );
};

export default ChatRoom;
