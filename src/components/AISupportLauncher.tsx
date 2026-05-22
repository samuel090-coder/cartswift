import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Headphones, Send, X, ImagePlus, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Msg = {
  id: string;
  chat_id: string;
  sender: 'user' | 'ai' | 'admin';
  content: string | null;
  image_url: string | null;
  created_at: string;
};

// Hide the launcher on these routes
const HIDDEN_ROUTES = ['/admin', '/admin/dashboard', '/admin/check', '/auth', '/reset-password'];

const AISupportLauncher = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hidden = HIDDEN_ROUTES.some(r => location.pathname === r || location.pathname.startsWith(r + '/'));

  // Ensure chat exists and load history once user logs in
  useEffect(() => {
    if (!user) { setChatId(null); setMessages([]); return; }
    let active = true;
    (async () => {
      const { data: existing } = await supabase
        .from('support_chats')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      let id = existing?.id;
      if (!id) {
        const { data: created } = await supabase
          .from('support_chats')
          .insert({ user_id: user.id })
          .select('id')
          .single();
        id = created?.id;
      }
      if (!active || !id) return;
      setChatId(id);
      const { data: msgs } = await supabase
        .from('support_messages')
        .select('*')
        .eq('chat_id', id)
        .order('created_at', { ascending: true });
      if (active && msgs) setMessages(msgs as Msg[]);
    })();
    return () => { active = false; };
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!chatId) return;
    const ch = supabase
      .channel(`support-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
        setMessages(prev => prev.find(m => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, aiThinking]);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `support/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-media').upload(path, file);
    if (error) { toast.error('Upload failed'); return null; }
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
    return data.publicUrl;
  };

  const sendMessage = async (text: string, imageUrl: string | null = null) => {
    if (!user || !chatId) { toast.error('Please sign in to chat with support'); return; }
    if (!text.trim() && !imageUrl) return;
    setSending(true);
    const { data: inserted, error } = await supabase
      .from('support_messages')
      .insert({ chat_id: chatId, sender: 'user', content: text.trim() || null, image_url: imageUrl })
      .select()
      .single();
    if (error) { toast.error(error.message); setSending(false); return; }
    setMessages(prev => prev.find(m => m.id === inserted.id) ? prev : [...prev, inserted as Msg]);
    await supabase.from('support_chats').update({ last_message_at: new Date().toISOString(), unread_admin: 1 }).eq('id', chatId);
    setInput('');
    setSending(false);

    // Trigger AI if enabled
    const { data: settings } = await supabase.from('ai_support_settings').select('ai_enabled').eq('id', true).maybeSingle();
    if (settings?.ai_enabled) {
      setAiThinking(true);
      try {
        await supabase.functions.invoke('ai-support-chat', { body: { chat_id: chatId, message: text, image_url: imageUrl } });
      } catch (e) {
        console.error('AI invoke error', e);
      } finally {
        setAiThinking(false);
      }
    }
  };

  const handleSend = () => sendMessage(input);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    const url = await uploadImage(file);
    if (url) await sendMessage(input, url);
  };

  if (hidden) return null;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed right-4 bottom-40 z-40 w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center text-white"
            aria-label="Open support"
          >
            <Headphones className="w-6 h-6" />
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/40" />
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">CartSwift Support</div>
                <div className="flex items-center gap-1 text-xs opacity-90">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  We're online
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/10 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!user ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Please sign in to chat with our support team.
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                {messages.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Hi! How can we help you today?</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(m => (
                      <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {m.sender !== 'user' && (
                            <Badge variant="secondary" className="text-[10px] mb-1">{m.sender === 'ai' ? '🤖 AI Support' : '👤 Support'}</Badge>
                          )}
                          {m.image_url && (
                            <img src={m.image_url} alt="attachment" className="rounded-lg mb-1 max-w-full" />
                          )}
                          {m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
                          <p className={`text-[10px] mt-1 ${m.sender === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {aiThinking && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" /> AI is typing...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              <div className="p-3 border-t flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
                <Button size="icon" variant="ghost" onClick={() => fileRef.current?.click()} disabled={sending}>
                  <ImagePlus className="w-5 h-5" />
                </Button>
                <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." disabled={sending} />
                <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AISupportLauncher;
