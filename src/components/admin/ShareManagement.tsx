import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Edit, Eye, Share, BarChart3, ExternalLink, Copy } from 'lucide-react';

type Item = Database['public']['Tables']['items']['Row'];
type ShareSettings = Database['public']['Tables']['share_settings']['Row'];
type ShareAnalytics = Database['public']['Tables']['share_analytics']['Row'];

interface ItemWithShare extends Item {
  share_settings?: ShareSettings;
}

interface ShareFormData {
  is_shareable: boolean;
  share_headline: string;
  share_benefits: string[];
  hero_media_url: string;
  hero_media_type: 'image' | 'video';
  cta_text: string;
  social_proof_text: string;
}

const ShareManagement = () => {
  const [selectedItem, setSelectedItem] = useState<ItemWithShare | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ShareFormData>({
    is_shareable: false,
    share_headline: '',
    share_benefits: ['', '', ''],
    hero_media_url: '',
    hero_media_type: 'image',
    cta_text: 'Buy Now',
    social_proof_text: ''
  });
  const [benefitInputs, setBenefitInputs] = useState(['', '', '']);

  const queryClient = useQueryClient();

  // Fetch items with share settings
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items-with-shares'],
    queryFn: async (): Promise<ItemWithShare[]> => {
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      const { data: shareSettings, error: shareError } = await supabase
        .from('share_settings')
        .select('*');

      if (shareError) throw shareError;

      return items.map(item => ({
        ...item,
        share_settings: shareSettings.find(s => s.item_id === item.id)
      }));
    }
  });

  // Fetch analytics for all items
  const { data: allAnalytics = [] } = useQuery({
    queryKey: ['share-analytics-all'],
    queryFn: async (): Promise<ShareAnalytics[]> => {
      const { data, error } = await supabase
        .from('share_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Save share settings
  const saveShareSettings = useMutation({
    mutationFn: async ({ itemId, settings }: { itemId: string, settings: ShareFormData }) => {
      const { data, error } = await supabase
        .from('share_settings')
        .upsert({
          item_id: itemId,
          is_shareable: settings.is_shareable,
          share_headline: settings.share_headline || null,
          share_benefits: settings.share_benefits.filter(b => b.trim()),
          hero_media_url: settings.hero_media_url || null,
          hero_media_type: settings.hero_media_type,
          cta_text: settings.cta_text || 'Buy Now',
          social_proof_text: settings.social_proof_text || null
        }, {
          onConflict: 'item_id'
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Share settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['items-with-shares'] });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    }
  });

  const handleEdit = (item: ItemWithShare) => {
    setSelectedItem(item);
    
    if (item.share_settings) {
      setFormData({
        is_shareable: item.share_settings.is_shareable,
        share_headline: item.share_settings.share_headline || '',
        share_benefits: item.share_settings.share_benefits || ['', '', ''],
        hero_media_url: item.share_settings.hero_media_url || '',
        hero_media_type: item.share_settings.hero_media_type as 'image' | 'video' || 'image',
        cta_text: item.share_settings.cta_text || 'Buy Now',
        social_proof_text: item.share_settings.social_proof_text || ''
      });
      setBenefitInputs(item.share_settings.share_benefits?.slice(0, 3) || ['', '', '']);
    } else {
      setFormData({
        is_shareable: false,
        share_headline: item.title,
        share_benefits: ['', '', ''],
        hero_media_url: item.images?.[0] || '',
        hero_media_type: 'image',
        cta_text: 'Buy Now',
        social_proof_text: ''
      });
      setBenefitInputs(['', '', '']);
    }
    
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedItem) return;

    const updatedFormData = {
      ...formData,
      share_benefits: benefitInputs.filter(b => b.trim())
    };

    saveShareSettings.mutate({ 
      itemId: selectedItem.id, 
      settings: updatedFormData 
    });
  };

  const copyShareUrl = (itemId: string) => {
    const url = `${window.location.origin}/share/${itemId}`;
    navigator.clipboard.writeText(url);
    toast.success('Share URL copied to clipboard!');
  };

  const getAnalyticsStats = (itemId: string) => {
    const itemAnalytics = allAnalytics.filter(a => a.item_id === itemId);
    const views = itemAnalytics.filter(a => a.event_type === 'view').length;
    const clicks = itemAnalytics.filter(a => a.event_type === 'click').length;
    const conversions = itemAnalytics.filter(a => a.event_type === 'conversion').length;
    
    return { views, clicks, conversions };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Share View Management</h2>
        <Badge variant="outline" className="text-sm">
          {items.filter(item => item.share_settings?.is_shareable).length} Active Shares
        </Badge>
      </div>

      <div className="grid gap-4">
        {items.map((item) => {
          const stats = item.share_settings?.is_shareable ? getAnalyticsStats(item.id) : null;
          
          return (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={item.images?.[0] || '/placeholder.svg'}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        ${Number(item.price).toFixed(2)}
                        {item.discount_percentage && (
                          <span className="ml-2 text-destructive">
                            {item.discount_percentage}% OFF
                          </span>
                        )}
                      </p>
                      {item.share_settings && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={item.share_settings.is_shareable ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {item.share_settings.is_shareable ? "Active" : "Inactive"}
                          </Badge>
                          {stats && item.share_settings.is_shareable && (
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <span>👁 {stats.views}</span>
                              <span>👆 {stats.clicks}</span>
                              <span>💰 {stats.conversions}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.share_settings?.is_shareable && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyShareUrl(item.id)}
                        >
                          <Copy size={16} className="mr-1" />
                          Copy URL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={`/share/${item.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink size={16} className="mr-1" />
                            View
                          </a>
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Share Settings - {selectedItem?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Enable/Disable Share */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Enable Share View</Label>
                <p className="text-sm text-muted-foreground">
                  Make this product shareable with a dedicated page
                </p>
              </div>
              <Switch
                checked={formData.is_shareable}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, is_shareable: checked }))
                }
              />
            </div>

            {/* Share Headline */}
            <div className="space-y-2">
              <Label htmlFor="headline">Share Headline</Label>
              <Input
                id="headline"
                value={formData.share_headline}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, share_headline: e.target.value }))
                }
                placeholder="Enter compelling headline..."
              />
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <Label>Key Benefits (up to 3)</Label>
              {benefitInputs.map((benefit, index) => (
                <Input
                  key={index}
                  value={benefit}
                  onChange={(e) => {
                    const newBenefits = [...benefitInputs];
                    newBenefits[index] = e.target.value;
                    setBenefitInputs(newBenefits);
                  }}
                  placeholder={`Benefit ${index + 1}...`}
                />
              ))}
            </div>

            {/* Hero Media */}
            <div className="space-y-2">
              <Label htmlFor="media-url">Hero Media URL</Label>
              <Input
                id="media-url"
                value={formData.hero_media_url}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, hero_media_url: e.target.value }))
                }
                placeholder="Image or video URL..."
              />
              <div className="flex items-center gap-4">
                <Label className="text-sm">Media Type:</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.hero_media_type === 'image' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, hero_media_type: 'image' }))}
                  >
                    Image
                  </Button>
                  <Button
                    type="button"
                    variant={formData.hero_media_type === 'video' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, hero_media_type: 'video' }))}
                  >
                    Video
                  </Button>
                </div>
              </div>
            </div>

            {/* CTA Text */}
            <div className="space-y-2">
              <Label htmlFor="cta-text">Call-to-Action Text</Label>
              <Input
                id="cta-text"
                value={formData.cta_text}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, cta_text: e.target.value }))
                }
                placeholder="Buy Now, Get Yours Today, etc."
              />
            </div>

            {/* Social Proof */}
            <div className="space-y-2">
              <Label htmlFor="social-proof">Social Proof Text</Label>
              <Textarea
                id="social-proof"
                value={formData.social_proof_text}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, social_proof_text: e.target.value }))
                }
                placeholder="Customer testimonial or social proof..."
                rows={3}
              />
            </div>

            {/* Preview URL */}
            {formData.is_shareable && selectedItem && (
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Share URL Preview:</Label>
                <p className="text-sm font-mono text-muted-foreground mt-1">
                  {window.location.origin}/share/{selectedItem.id}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveShareSettings.isPending}
            >
              {saveShareSettings.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShareManagement;