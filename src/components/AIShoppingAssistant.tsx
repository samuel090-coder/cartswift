import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { Bot, Send, X, Sparkles, ShoppingCart, Search, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: any[];
}

const AIShoppingAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your AI shopping assistant. I can help you find products, compare items, or answer questions about our store. What are you looking for today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const searchProducts = async (query: string) => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(4);
    return data || [];
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Search for relevant products based on user query
      const products = await searchProducts(input);

      // Generate AI response
      let assistantContent = '';
      
      if (products.length > 0) {
        assistantContent = `I found ${products.length} product${products.length > 1 ? 's' : ''} that might interest you! Here are some options:\n\n`;
        products.forEach((p, i) => {
          assistantContent += `**${i + 1}. ${p.title}** - $${p.price}\n`;
        });
        assistantContent += '\nWould you like me to add any of these to your cart, or would you like more details?';
      } else {
        // Fallback responses for common queries
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('shipping') || lowerInput.includes('delivery')) {
          assistantContent = "🚚 We offer fast shipping! Standard delivery takes 3-5 business days. VIP and Premium members enjoy free shipping on orders over $25. Would you like to know more about our shipping options?";
        } else if (lowerInput.includes('return') || lowerInput.includes('refund')) {
          assistantContent = "📦 We have a 30-day return policy! If you're not satisfied, you can return most items for a full refund. Premium members also get free returns. How can I help you with your order?";
        } else if (lowerInput.includes('discount') || lowerInput.includes('sale')) {
          assistantContent = "🏷️ Check out our Flash Sales tab for the best deals! VIP members also get early access to exclusive discounts. Would you like me to show you today's trending deals?";
        } else if (lowerInput.includes('help') || lowerInput.includes('support')) {
          assistantContent = "I'm here to help! I can:\n• 🔍 Find products for you\n• 🛒 Add items to your cart\n• 📦 Answer shipping questions\n• 💰 Show you the best deals\n\nJust tell me what you need!";
        } else {
          assistantContent = `I couldn't find specific products matching "${input}", but I can help you browse our categories: Fashion, Books, Tools, Vehicles, and Animals. What type of product are you interested in?`;
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        products: products.length > 0 ? products : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product: any) => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.images?.[0] || '/placeholder.svg',
      currency: product.currency || 'USD',
    });
    toast.success(`${product.title} added to cart!`);
  };

  const quickActions = [
    { label: 'Show deals', icon: Sparkles },
    { label: 'Fashion items', icon: Package },
    { label: 'Track order', icon: Search },
  ];

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-20 right-4 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Bot className="w-6 h-6" />
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
            className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]"
          >
            <Card className="shadow-2xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-6 h-6" />
                    <CardTitle className="text-lg">AI Shopping Assistant</CardTitle>
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
                <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Product cards */}
                          {message.products && message.products.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.products.map((product) => (
                                <div
                                  key={product.id}
                                  className="bg-background rounded-lg p-2 flex items-center gap-2"
                                >
                                  <img
                                    src={product.images?.[0] || '/placeholder.svg'}
                                    alt={product.title}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{product.title}</p>
                                    <p className="text-xs text-primary font-bold">${product.price}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2"
                                    onClick={() => handleAddToCart(product)}
                                  >
                                    <ShoppingCart className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl px-4 py-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-100" />
                            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-200" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Quick Actions */}
                {messages.length === 1 && (
                  <div className="px-4 pb-2 flex gap-2 flex-wrap">
                    {quickActions.map((action) => (
                      <Button
                        key={action.label}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setInput(action.label);
                        }}
                      >
                        <action.icon className="w-3 h-3 mr-1" />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask me anything..."
                      disabled={isLoading}
                    />
                    <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
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

export default AIShoppingAssistant;
