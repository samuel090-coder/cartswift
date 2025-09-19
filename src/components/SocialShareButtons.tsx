import { useMutation } from '@tanstack/react-query';
import { Share2, Facebook, Twitter, MessageCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SocialShareButtonsProps {
  itemId: string;
  itemTitle: string;
  itemImage?: string;
  url?: string;
}

const SocialShareButtons = ({ itemId, itemTitle, itemImage, url }: SocialShareButtonsProps) => {
  const { toast } = useToast();
  const sessionId = sessionStorage.getItem('sessionId') || '';
  const shareUrl = url || `${window.location.origin}/share/${itemId}`;

  const recordShare = useMutation({
    mutationFn: async (platform: string) => {
      await supabase
        .from('social_shares')
        .insert({
          item_id: itemId,
          session_id: sessionId,
          platform,
          shared_url: shareUrl
        });
    },
    onSuccess: () => {
      toast({
        title: '🎉 Share Reward!',
        description: '+5 loyalty points earned for sharing!',
      });
    }
  });

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600',
      action: () => {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(itemTitle)}`;
        window.open(fbUrl, '_blank', 'width=600,height=400');
        recordShare.mutate('facebook');
      }
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'text-blue-400',
      action: () => {
        const tweetText = `Check out this amazing product: ${itemTitle}`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
        recordShare.mutate('twitter');
      }
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-600',
      action: () => {
        const whatsappText = `Check out this product: ${itemTitle} ${shareUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        window.open(whatsappUrl, '_blank');
        recordShare.mutate('whatsapp');
      }
    },
    {
      name: 'Copy Link',
      icon: Copy,
      color: 'text-gray-600',
      action: () => {
        navigator.clipboard.writeText(shareUrl);
        recordShare.mutate('copy');
        toast({
          title: 'Link copied!',
          description: 'Share link copied to clipboard',
        });
      }
    }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 size={16} />
          Share & Earn
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share & Earn 5 Points!</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 p-4">
          {shareOptions.map((option) => (
            <Button
              key={option.name}
              variant="outline"
              onClick={option.action}
              className="flex flex-col gap-2 h-20 hover:scale-105 transition-transform"
            >
              <option.icon size={24} className={option.color} />
              <span className="text-sm">{option.name}</span>
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Earn loyalty points for each platform you share to!
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default SocialShareButtons;