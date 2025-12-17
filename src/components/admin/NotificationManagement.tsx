import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Bell, Send, Users, Settings, Plus, Trash2, Eye, Clock, Zap } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  icon_emoji: string;
  link_url: string | null;
  trigger_type: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_sent: number;
  total_clicked: number;
  created_at: string;
}

interface NotificationSetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  is_enabled: boolean;
}

interface PushSubscription {
  id: string;
  session_id: string;
  created_at: string;
}

export const NotificationManagement = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    image_url: '',
    icon_emoji: '🔔',
    link_url: '',
    trigger_type: 'manual',
    scheduled_at: ''
  });

  // Fetch notifications
  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Notification[];
    }
  });

  // Fetch notification settings
  const { data: settings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*');
      if (error) throw error;
      return data as NotificationSetting[];
    }
  });

  // Fetch subscribers count
  const { data: subscribersCount = 0 } = useQuery({
    queryKey: ['push-subscribers-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    }
  });

  // Create notification mutation
  const createNotification = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: data.title,
          body: data.body,
          image_url: data.image_url || null,
          icon_emoji: data.icon_emoji,
          link_url: data.link_url || null,
          trigger_type: data.trigger_type,
          status: data.scheduled_at ? 'scheduled' : 'draft',
          scheduled_at: data.scheduled_at || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: 'Notification created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Send notification mutation
  const sendNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { notificationId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast({ title: 'Notification sent', description: `Sent to ${data?.sent || 0} subscribers` });
    },
    onError: (error: any) => {
      toast({ title: 'Error sending', description: error.message, variant: 'destructive' });
    }
  });

  // Delete notification mutation
  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast({ title: 'Notification deleted' });
    }
  });

  // Toggle setting mutation
  const toggleSetting = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('notification_settings')
        .update({ is_enabled, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({ title: 'Setting updated' });
    }
  });

  // Update setting template mutation
  const updateSettingTemplate = useMutation({
    mutationFn: async ({ id, setting_value }: { id: string; setting_value: any }) => {
      const { error } = await supabase
        .from('notification_settings')
        .update({ setting_value, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({ title: 'Template updated' });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      body: '',
      image_url: '',
      icon_emoji: '🔔',
      link_url: '',
      trigger_type: 'manual',
      scheduled_at: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'draft': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSettingLabel = (key: string) => {
    switch (key) {
      case 'new_product': return 'New Product Added';
      case 'flash_sale': return 'Flash Sale Started';
      case 'order_update': return 'Order Status Update';
      default: return key;
    }
  };

  const emojiOptions = ['🔔', '🔥', '🆕', '💰', '🎉', '📦', '⚡', '💎', '🎁', '🚀'];

  if (loadingNotifications || loadingSettings) {
    return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{subscribersCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Send className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{notifications.filter(n => n.status === 'sent').length}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{notifications.filter(n => n.status === 'scheduled').length}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{notifications.reduce((acc, n) => acc + n.total_clicked, 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Auto-Triggers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* Create Notification Button */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Create Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Push Notification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="w-20">
                    <Label>Icon</Label>
                    <Select value={formData.icon_emoji} onValueChange={(v) => setFormData({ ...formData, icon_emoji: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {emojiOptions.map(emoji => (
                          <SelectItem key={emoji} value={emoji}>{emoji}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="🔥 Don't miss out!"
                    />
                  </div>
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Amazing deals await you..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Image URL (optional)</Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Link URL (optional)</Label>
                  <Input
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://yoursite.com/deals"
                  />
                </div>
                <div>
                  <Label>Schedule (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                </div>
                <Button 
                  onClick={() => createNotification.mutate(formData)}
                  disabled={!formData.title || !formData.body || createNotification.isPending}
                  className="w-full"
                >
                  {createNotification.isPending ? 'Creating...' : 'Create Notification'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No notifications yet. Create your first one!
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card key={notification.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{notification.icon_emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold truncate">{notification.title}</h4>
                            <Badge className={getStatusColor(notification.status)}>
                              {notification.status}
                            </Badge>
                            {notification.trigger_type !== 'manual' && (
                              <Badge variant="outline">
                                <Zap className="h-3 w-3 mr-1" />
                                {notification.trigger_type}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Sent: {notification.total_sent.toLocaleString()}</span>
                            <span>Clicks: {notification.total_clicked.toLocaleString()}</span>
                            {notification.sent_at && (
                              <span>Sent at: {new Date(notification.sent_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {notification.status === 'draft' && (
                          <Button 
                            size="sm" 
                            onClick={() => sendNotification.mutate(notification.id)}
                            disabled={sendNotification.isPending}
                          >
                            <Send className="h-4 w-4 mr-1" /> Send
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteNotification.mutate(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Automatic Notification Triggers</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure automatic notifications for specific events
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.map((setting) => (
                <div key={setting.id} className="space-y-4 pb-4 border-b last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">{getSettingLabel(setting.setting_key)}</Label>
                      <p className="text-sm text-muted-foreground">
                        {setting.is_enabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <Switch
                      checked={setting.is_enabled}
                      onCheckedChange={(checked) => toggleSetting.mutate({ id: setting.id, is_enabled: checked })}
                    />
                  </div>
                  {setting.is_enabled && (
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                      <div>
                        <Label className="text-xs">Title Template</Label>
                        <Input
                          value={setting.setting_value.title_template}
                          onChange={(e) => updateSettingTemplate.mutate({
                            id: setting.id,
                            setting_value: { ...setting.setting_value, title_template: e.target.value }
                          })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Body Template</Label>
                        <Textarea
                          value={setting.setting_value.body_template}
                          onChange={(e) => updateSettingTemplate.mutate({
                            id: setting.id,
                            setting_value: { ...setting.setting_value, body_template: e.target.value }
                          })}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use variables: {'{{product_name}}'}, {'{{discount}}'}, {'{{order_id}}'}, {'{{status}}'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
