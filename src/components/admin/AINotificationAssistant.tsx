import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Wand2, 
  Sun, 
  Moon, 
  Clock, 
  Bell, 
  Gift, 
  Zap, 
  Heart, 
  Snowflake,
  ImagePlus,
  Loader2,
  Check,
  Copy
} from 'lucide-react';

interface NotificationSuggestion {
  title: string;
  body: string;
  icon_emoji: string;
}

interface AINotificationAssistantProps {
  onSelectNotification: (notification: { title: string; body: string; icon_emoji: string; image_url?: string }) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  morning: <Sun className="h-4 w-4" />,
  afternoon: <Sun className="h-4 w-4" />,
  evening: <Moon className="h-4 w-4" />,
  night: <Moon className="h-4 w-4" />,
  reminder: <Bell className="h-4 w-4" />,
  newProduct: <Gift className="h-4 w-4" />,
  sale: <Zap className="h-4 w-4" />,
  urgency: <Clock className="h-4 w-4" />,
  loyalty: <Heart className="h-4 w-4" />,
  seasonal: <Snowflake className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
  reminder: 'Reminder',
  newProduct: 'New Product',
  sale: 'Flash Sale',
  urgency: 'Urgency',
  loyalty: 'Loyalty',
  seasonal: 'Seasonal',
};

export const AINotificationAssistant = ({ onSelectNotification }: AINotificationAssistantProps) => {
  const [topic, setTopic] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});

  // Fetch premium templates
  const { data: templates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-notification-assistant', {
        body: { action: 'getTemplates' },
      });
      if (error) throw error;
      return data.templates as Record<string, NotificationSuggestion[]>;
    },
  });

  // AI suggestion mutation
  const suggestMutation = useMutation({
    mutationFn: async ({ topic, category }: { topic?: string; category?: string }) => {
      const { data, error } = await supabase.functions.invoke('ai-notification-assistant', {
        body: { action: 'suggest', topic, category },
      });
      if (error) throw error;
      return data.suggestions as NotificationSuggestion[];
    },
    onError: (error: any) => {
      toast({ title: 'AI Error', description: error.message, variant: 'destructive' });
    },
  });

  // Image generation mutation
  const generateImageMutation = useMutation({
    mutationFn: async (topic: string) => {
      const { data, error } = await supabase.functions.invoke('ai-notification-assistant', {
        body: { action: 'generateImage', topic },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, topic) => {
      if (data.imageUrl) {
        setGeneratedImages(prev => ({ ...prev, [topic]: data.imageUrl }));
        toast({ title: 'Image Generated', description: 'AI image created successfully!' });
      } else {
        toast({ title: 'No Image', description: 'Image generation returned no result.', variant: 'destructive' });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Image Generation Failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleGenerateImage = async (notification: NotificationSuggestion) => {
    const key = `${notification.title}-${notification.body}`;
    setGeneratingImageFor(key);
    try {
      await generateImageMutation.mutateAsync(`${notification.title} - ${notification.body}`);
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleSelectWithImage = (notification: NotificationSuggestion) => {
    const key = `${notification.title}-${notification.body}`;
    onSelectNotification({
      ...notification,
      image_url: generatedImages[key] || undefined,
    });
    toast({ title: 'Notification Selected', description: 'Content copied to the form!' });
  };

  const renderNotificationCard = (notification: NotificationSuggestion, index: number) => {
    const key = `${notification.title}-${notification.body}`;
    const hasImage = !!generatedImages[key];
    const isGenerating = generatingImageFor === key;

    return (
      <Card key={index} className="group hover:border-primary/50 transition-all">
        <CardContent className="p-4 space-y-3">
          {hasImage && (
            <div className="relative w-full h-24 rounded-lg overflow-hidden">
              <img 
                src={generatedImages[key]} 
                alt="Generated" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex items-start gap-3">
            <span className="text-2xl">{notification.icon_emoji}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{notification.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handleGenerateImage(notification)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : hasImage ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <ImagePlus className="h-3 w-3 mr-1" />
              )}
              {isGenerating ? 'Generating...' : hasImage ? 'Regenerate' : 'AI Image'}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handleSelectWithImage(notification)}
            >
              <Copy className="h-3 w-3 mr-1" /> Use
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">AI Notification Assistant</h3>
        <Badge variant="secondary" className="ml-auto">Premium</Badge>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="text-xs">
            <Gift className="h-3 w-3 mr-1" /> Templates
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">
            <Wand2 className="h-3 w-3 mr-1" /> AI Generate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 mt-4">
          {/* Category Pills */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {Object.keys(categoryLabels).map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  className="flex-shrink-0"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  {categoryIcons[cat]}
                  <span className="ml-1">{categoryLabels[cat]}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Templates Grid */}
          <ScrollArea className="h-[300px]">
            <div className="grid gap-3">
              {selectedCategory && templates?.[selectedCategory]?.map((t, i) => 
                renderNotificationCard(t, i)
              )}
              {!selectedCategory && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a category to see templates</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4 mt-4">
          {/* AI Topic Input */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter topic (e.g., 'Christmas sale', 'New shoes arrived')"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => suggestMutation.mutate({ topic })}
                disabled={!topic.trim() || suggestMutation.isPending}
              >
                {suggestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Quick Category Buttons */}
            <div className="flex flex-wrap gap-2">
              {['morning', 'sale', 'newProduct', 'reminder'].map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => suggestMutation.mutate({ category: cat })}
                  disabled={suggestMutation.isPending}
                >
                  {categoryIcons[cat]}
                  <span className="ml-1">{categoryLabels[cat]}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* AI Suggestions */}
          <ScrollArea className="h-[250px]">
            <div className="grid gap-3">
              {suggestMutation.isPending && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">AI is thinking...</p>
                </div>
              )}
              {suggestMutation.data?.map((suggestion, i) => 
                renderNotificationCard(suggestion, i)
              )}
              {!suggestMutation.isPending && !suggestMutation.data && (
                <div className="text-center py-8 text-muted-foreground">
                  <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Enter a topic or select a category</p>
                  <p className="text-xs mt-1">AI will generate custom notifications</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
