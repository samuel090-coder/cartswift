import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Video, Radio, Users, MessageCircle, Heart, ShoppingBag, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const LiveShoppingPanel = () => {
  const [isLive, setIsLive] = useState(false);

  return (
    <Card className="bg-card border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Video className="h-5 w-5 text-destructive" />
            Live Shopping
          </CardTitle>
          {isLive && (
            <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-1">
              <Radio className="h-3 w-3" />
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLive ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <Video className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Go Live & Sell</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start a live stream to showcase products and interact with buyers in real-time
              </p>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Stream title (e.g., 'New Collection Drop!')"
                className="bg-secondary border-border/50 text-foreground"
              />
              <Button 
                className="w-full btn-premium gap-2"
                onClick={() => setIsLive(true)}
              >
                <Radio className="h-4 w-4" />
                Start Live Stream
              </Button>
            </div>
            <div className="flex items-start gap-2 p-3 bg-neon-amber/10 rounded-lg border border-neon-amber/20">
              <AlertCircle className="h-4 w-4 text-neon-amber mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Tip: Schedule your stream in advance to notify your followers and boost viewership
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Live Stream Preview */}
            <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-2 animate-pulse">
                    <Radio className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-sm text-foreground font-medium">Camera preview</p>
                </div>
              </div>
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge className="bg-destructive text-destructive-foreground animate-pulse text-xs">
                  ● LIVE
                </Badge>
                <Badge variant="outline" className="bg-background/60 text-foreground backdrop-blur-sm text-xs gap-1">
                  <Users className="h-3 w-3" />
                  {Math.floor(Math.random() * 50 + 5)}
                </Badge>
              </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-secondary/50 rounded-lg">
                <Users className="h-4 w-4 text-neon-cyan mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Viewers</p>
                <p className="font-bold text-foreground">{Math.floor(Math.random() * 50 + 5)}</p>
              </div>
              <div className="text-center p-2 bg-secondary/50 rounded-lg">
                <Heart className="h-4 w-4 text-destructive mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Likes</p>
                <p className="font-bold text-foreground">{Math.floor(Math.random() * 200 + 10)}</p>
              </div>
              <div className="text-center p-2 bg-secondary/50 rounded-lg">
                <ShoppingBag className="h-4 w-4 text-neon-emerald mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Sales</p>
                <p className="font-bold text-foreground">{Math.floor(Math.random() * 10)}</p>
              </div>
            </div>

            {/* Chat */}
            <div className="h-32 bg-secondary/30 rounded-lg border border-border/30 p-3 overflow-y-auto space-y-2">
              <div className="flex gap-2">
                <span className="text-xs font-semibold text-neon-cyan">user123:</span>
                <span className="text-xs text-foreground">Love this product! 😍</span>
              </div>
              <div className="flex gap-2">
                <span className="text-xs font-semibold text-neon-amber">shopper_22:</span>
                <span className="text-xs text-foreground">What sizes available?</span>
              </div>
              <div className="flex gap-2">
                <span className="text-xs font-semibold text-neon-violet">fashion_fan:</span>
                <span className="text-xs text-foreground">Just bought one! 🛒</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Chat with viewers..."
                className="flex-1 bg-secondary border-border/50 text-foreground text-sm"
              />
              <Button size="icon" className="btn-premium shrink-0">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setIsLive(false)}
            >
              End Stream
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveShoppingPanel;
