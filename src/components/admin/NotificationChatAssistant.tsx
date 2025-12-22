import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Loader2, Sparkles, Copy } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  notification?: {
    title: string;
    body: string;
    icon_emoji: string;
  };
}

interface NotificationChatAssistantProps {
  onSelectNotification: (notification: { title: string; body: string; icon_emoji: string }) => void;
}

export const NotificationChatAssistant = ({ onSelectNotification }: NotificationChatAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI notification assistant. Tell me what kind of notification you want to create, and I'll help you craft the perfect message. For example:\n\n• \"Create a flash sale notification\"\n• \"I need a morning greeting for customers\"\n• \"Help me announce a new product launch\""
    }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const { data, error } = await supabase.functions.invoke('ai-notification-assistant', {
        body: { 
          action: 'chat',
          message: userMessage,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        notification: data.notification || undefined
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again."
      }]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUseNotification = (notification: { title: string; body: string; icon_emoji: string }) => {
    onSelectNotification(notification);
    toast({ title: 'Notification Selected', description: 'Content copied to the form!' });
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-semibold">AI Chat Assistant</span>
        <Sparkles className="h-4 w-4 text-amber-500" />
      </div>

      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="bg-primary/10 p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] space-y-2 ${message.role === 'user' ? 'order-first' : ''}`}>
                <Card className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}>
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </CardContent>
                </Card>
                
                {message.notification && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{message.notification.icon_emoji}</span>
                        <div>
                          <p className="font-semibold text-sm">{message.notification.title}</p>
                          <p className="text-xs text-muted-foreground">{message.notification.body}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full gap-2"
                        onClick={() => handleUseNotification(message.notification!)}
                      >
                        <Copy className="h-3 w-3" /> Use This Notification
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
              {message.role === 'user' && (
                <div className="bg-primary p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {chatMutation.isPending && (
            <div className="flex gap-3">
              <div className="bg-primary/10 p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-3 pt-3 border-t">
        <Input
          placeholder="Describe the notification you want..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={chatMutation.isPending}
          className="flex-1"
        />
        <Button 
          onClick={handleSend} 
          disabled={!input.trim() || chatMutation.isPending}
          size="icon"
        >
          {chatMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};