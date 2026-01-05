import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageCircle, Send, X, Headphones, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getSessionId = () => {
  let sessionId = localStorage.getItem('cartswift-session-id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cartswift-session-id', sessionId);
  }
  return sessionId;
};

const LiveChatSupport = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sessionId] = useState(getSessionId());
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch or create chat session
  const { data: chatSession } = useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: async () => {
      // Try to get existing open session
      const { data: existing } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'open')
        .single();
      
      if (existing) return existing;

      // Create new session
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({ session_id: sessionId, status: 'open' })
        .select()
        .single();
      
      if (error) throw error;
      return newSession;
    },
    enabled: isOpen,
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', chatSession?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_session_id', chatSession?.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!chatSession?.id,
    refetchInterval: 3000, // Poll for new messages
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_session_id: chatSession?.id,
          sender_type: 'user',
          message,
        });
      if (error) throw error;

      // Auto-reply with AI after a short delay (simulating support)
      setTimeout(async () => {
        const responses = [
          "Thanks for your message! A support agent will be with you shortly. In the meantime, have you checked our FAQ section?",
          "I understand your concern. Let me look into this for you. Can you provide more details?",
          "Thank you for reaching out! We're here to help. What specific assistance do you need today?",
          "Got it! Our team is reviewing your request. Typical response time is 2-5 minutes during business hours.",
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        await supabase
          .from('chat_messages')
          .insert({
            chat_session_id: chatSession?.id,
            sender_type: 'support',
            message: randomResponse,
          });
        
        queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      }, 1500);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      setInput('');
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage.mutate(input);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-4 right-4 z-40"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 left-4 z-40 w-[350px] max-w-[calc(100vw-2rem)]"
          >
            <Card className="shadow-2xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-5 h-5" />
                    <div>
                      <CardTitle className="text-base">Live Support</CardTitle>
                      <div className="flex items-center gap-1 text-xs opacity-90">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Online
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <ScrollArea className="h-[300px] p-4" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Headphones className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Start a conversation with our support team
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Avg. response: 2-5 min
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                              msg.sender_type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.sender_type === 'support' && (
                              <Badge variant="secondary" className="text-[10px] mb-1">
                                Support
                              </Badge>
                            )}
                            <p className="text-sm">{msg.message}</p>
                            <p className={`text-[10px] mt-1 ${
                              msg.sender_type === 'user' ? 'text-white/70' : 'text-muted-foreground'
                            }`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Type your message..."
                      disabled={sendMessage.isPending}
                    />
                    <Button 
                      onClick={handleSend} 
                      disabled={sendMessage.isPending || !input.trim()}
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveChatSupport;
