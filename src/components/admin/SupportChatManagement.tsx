import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Sparkles, Bot, Loader2 } from 'lucide-react';

type Chat = { id: string; user_id: string; last_message_at: string; profile?: { full_name: string | null; avatar_url: string | null; email: string | null } };
type Msg = { id: string; chat_id: string; sender: 'user'|'ai'|'admin'; content: string | null; image_url: string | null; created_at: string };

const SupportChatManagement = () => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [rewriting, setRewriting] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('ai_support_settings').select('ai_enabled').eq('id', true).maybeSingle().then(({ data }) => {
      if (data) setAiEnabled(data.ai_enabled);
    });
    loadChats();
    const ch = supabase.channel('admin-support')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_chats' }, loadChats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadChats = async () => {
    const { data } = await supabase.from('support_chats').select('*').order('last_message_at', { ascending: false });
    if (!data) return;
    const userIds = data.map(c => c.user_id);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds);
    setChats(data.map(c => ({ ...c, profile: profiles?.find(p => p.id === c.user_id) || undefined } as Chat)));
  };

  useEffect(() => {
    if (!selected) return;
    supabase.from('support_messages').select('*').eq('chat_id', selected.id).order('created_at').then(({ data }) => setMessages((data as Msg[]) || []));
    const ch = supabase.channel(`admin-chat-${selected.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${selected.id}` }, (p) => {
        setMessages(prev => prev.find(m => m.id === (p.new as any).id) ? prev : [...prev, p.new as Msg]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const toggleAi = async (v: boolean) => {
    setAiEnabled(v);
    const { error } = await supabase.from('ai_support_settings').update({ ai_enabled: v, updated_at: new Date().toISOString() }).eq('id', true);
    if (error) { toast.error(error.message); setAiEnabled(!v); }
    else toast.success(v ? 'AI replies enabled' : 'AI replies disabled — you reply manually');
  };

  const sendReply = async () => {
    if (!selected || !draft.trim()) return;
    setRewriting(true);
    let finalText = draft;
    try {
      const { data } = await supabase.functions.invoke('admin-rewrite-message', { body: { text: draft } });
      if (data?.rewritten) finalText = data.rewritten;
    } catch (e) { console.error(e); }
    setRewriting(false);
    setSending(true);
    const { error } = await supabase.from('support_messages').insert({ chat_id: selected.id, sender: 'admin', content: finalText });
    if (error) toast.error(error.message);
    else {
      await supabase.from('support_chats').update({ last_message_at: new Date().toISOString() }).eq('id', selected.id);
      setDraft('');
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-slate-900/60 border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-amber-400" />
          <div>
            <Label className="text-amber-200">AI Auto-Reply</Label>
            <p className="text-xs text-slate-400">When ON, AI handles customer messages. When OFF, your replies are auto-polished before sending.</p>
          </div>
        </div>
        <Switch checked={aiEnabled} onCheckedChange={toggleAi} />
      </Card>

      <div className="grid md:grid-cols-3 gap-4 h-[60vh]">
        <Card className="p-2 bg-slate-900/60 border-amber-500/20 overflow-hidden flex flex-col">
          <div className="text-xs text-amber-300 px-2 py-1">Conversations</div>
          <ScrollArea className="flex-1">
            {chats.length === 0 && <p className="text-xs text-slate-500 p-3">No chats yet</p>}
            {chats.map(c => (
              <button key={c.id} onClick={() => setSelected(c)} className={`w-full text-left p-2 rounded flex items-center gap-2 hover:bg-amber-500/10 ${selected?.id === c.id ? 'bg-amber-500/10' : ''}`}>
                <Avatar className="w-9 h-9"><AvatarImage src={c.profile?.avatar_url || undefined} /><AvatarFallback>{(c.profile?.full_name || c.profile?.email || '?')[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">{c.profile?.full_name || c.profile?.email || 'User'}</div>
                  <div className="text-[10px] text-slate-500">{new Date(c.last_message_at).toLocaleString()}</div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </Card>

        <Card className="md:col-span-2 bg-slate-900/60 border-amber-500/20 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Select a conversation</div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                <div className="space-y-3">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${m.sender === 'user' ? 'bg-slate-800 text-slate-100' : m.sender === 'ai' ? 'bg-purple-600/30 text-purple-100' : 'bg-amber-600/30 text-amber-100'}`}>
                        <Badge variant="secondary" className="text-[10px] mb-1">{m.sender === 'ai' ? 'AI' : m.sender === 'admin' ? 'You' : 'Customer'}</Badge>
                        {m.image_url && <img src={m.image_url} className="rounded mb-1 max-w-full" />}
                        {m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-amber-500/20 flex gap-2">
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !sending && sendReply()} placeholder={aiEnabled ? 'AI is replying automatically. You can still send a message.' : 'Type reply — will be polished before sending'} className="bg-slate-800 border-amber-500/20 text-slate-100" />
                <Button onClick={sendReply} disabled={sending || rewriting || !draft.trim()} className="bg-amber-600 hover:bg-amber-700">
                  {rewriting ? <Sparkles className="w-4 h-4 animate-pulse" /> : sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SupportChatManagement;
