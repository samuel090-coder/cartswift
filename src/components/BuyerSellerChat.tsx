import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  sender: 'buyer' | 'seller';
  timestamp: Date;
}

interface BuyerSellerChatProps {
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
}

const BuyerSellerChat = ({ sellerId, sellerName, sellerAvatar }: BuyerSellerChatProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hi! Welcome to ${sellerName}'s store. How can I help you today? 😊`,
      sender: 'seller',
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to message sellers', variant: 'destructive' });
      return;
    }

    const msg: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'buyer',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');

    // Simulate seller response
    setTimeout(() => {
      const autoReply: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thanks for your message! I'll get back to you shortly. 🙏",
        sender: 'seller',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, autoReply]);
    }, 1500);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-border text-foreground hover:bg-secondary">
          <MessageCircle className="h-4 w-4" />
          Message Seller
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-card border-border w-[350px] sm:w-[400px] flex flex-col p-0">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/30">
            <AvatarImage src={sellerAvatar} />
            <AvatarFallback className="bg-primary/20 text-primary">
              <Store className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{sellerName}</h3>
            <p className="text-xs text-neon-emerald">● Online</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender === 'buyer' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  msg.sender === 'buyer'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-secondary text-foreground rounded-bl-sm'
                }`}>
                  {msg.text}
                  <p className={`text-[10px] mt-1 ${
                    msg.sender === 'buyer' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-secondary border-border/50 text-foreground"
            />
            <Button type="submit" size="icon" className="btn-premium shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BuyerSellerChat;
