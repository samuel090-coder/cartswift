import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bot, Save, Plus, X, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AutoReplySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newQuickReply, setNewQuickReply] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['auto-reply-settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('seller_auto_replies')
        .select('*')
        .eq('seller_id', user!.id)
        .single();
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (settings) {
        const { error } = await supabase
          .from('seller_auto_replies')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('seller_id', user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('seller_auto_replies')
          .insert({ seller_id: user!.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reply-settings'] });
      toast({ title: 'Settings saved!' });
    },
  });

  const [form, setForm] = useState({
    is_enabled: settings?.is_enabled ?? true,
    greeting_message: settings?.greeting_message ?? "Hi! Thanks for reaching out. I'll get back to you shortly! 😊",
    away_message: settings?.away_message ?? "I'm currently away but will respond as soon as I can.",
    is_away: settings?.is_away ?? false,
    response_delay_seconds: settings?.response_delay_seconds ?? 3,
    quick_replies: (settings?.quick_replies as string[] | null) ?? ["What's the price?", "Is this available?", "When can you ship?"],
  });

  // Sync form with settings once loaded
  useState(() => {
    if (settings) {
      setForm({
        is_enabled: settings.is_enabled,
        greeting_message: settings.greeting_message,
        away_message: settings.away_message || '',
        is_away: settings.is_away,
        response_delay_seconds: settings.response_delay_seconds,
        quick_replies: (settings.quick_replies as string[] | null) || [],
      });
    }
  });

  const addQuickReply = () => {
    if (!newQuickReply.trim()) return;
    setForm(prev => ({ ...prev, quick_replies: [...prev.quick_replies, newQuickReply.trim()] }));
    setNewQuickReply('');
  };

  const removeQuickReply = (idx: number) => {
    setForm(prev => ({ ...prev, quick_replies: prev.quick_replies.filter((_, i) => i !== idx) }));
  };

  if (!user) return null;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Auto-Reply Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Enable Auto-Reply</p>
            <p className="text-xs text-muted-foreground">Automatically respond to buyer messages</p>
          </div>
          <Switch checked={form.is_enabled} onCheckedChange={(v) => setForm(prev => ({ ...prev, is_enabled: v }))} />
        </div>

        {/* Away mode */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Away Mode</p>
            <p className="text-xs text-muted-foreground">Use away message instead of greeting</p>
          </div>
          <Switch checked={form.is_away} onCheckedChange={(v) => setForm(prev => ({ ...prev, is_away: v }))} />
        </div>

        {/* Greeting */}
        <div>
          <label className="text-sm font-medium text-foreground flex items-center gap-1 mb-1">
            <MessageSquare className="h-3.5 w-3.5" /> Greeting Message
          </label>
          <Textarea
            value={form.greeting_message}
            onChange={(e) => setForm(prev => ({ ...prev, greeting_message: e.target.value }))}
            className="bg-secondary border-border/50 text-sm"
            rows={3}
          />
        </div>

        {/* Away message */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Away Message</label>
          <Textarea
            value={form.away_message}
            onChange={(e) => setForm(prev => ({ ...prev, away_message: e.target.value }))}
            className="bg-secondary border-border/50 text-sm"
            rows={2}
          />
        </div>

        {/* Response delay */}
        <div>
          <label className="text-sm font-medium text-foreground flex items-center gap-1 mb-1">
            <Clock className="h-3.5 w-3.5" /> Response Delay (seconds)
          </label>
          <Input
            type="number"
            min={1}
            max={60}
            value={form.response_delay_seconds}
            onChange={(e) => setForm(prev => ({ ...prev, response_delay_seconds: parseInt(e.target.value) || 3 }))}
            className="bg-secondary border-border/50 w-24"
          />
        </div>

        {/* Quick replies */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Quick Replies (suggested to buyers)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.quick_replies.map((reply, idx) => (
              <Badge key={idx} variant="secondary" className="gap-1 text-xs">
                {reply}
                <button onClick={() => removeQuickReply(idx)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newQuickReply}
              onChange={(e) => setNewQuickReply(e.target.value)}
              placeholder="Add quick reply..."
              className="flex-1 h-8 text-sm bg-secondary border-border/50"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuickReply(); } }}
            />
            <Button size="sm" variant="outline" onClick={addQuickReply} className="h-8">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <Button onClick={() => saveMutation.mutate(form)} className="w-full gap-2" disabled={saveMutation.isPending}>
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AutoReplySettings;
