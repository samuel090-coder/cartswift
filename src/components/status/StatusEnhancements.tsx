import { useState } from 'react';
import { BarChart2, ThumbsUp, MessageCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface StatusPollProps {
  question: string;
  options: string[];
  onVote?: (optionIndex: number) => void;
}

export const StatusPoll = ({ question, options, onVote }: StatusPollProps) => {
  const [voted, setVoted] = useState<number | null>(null);
  const [votes, setVotes] = useState(() => options.map(() => Math.floor(Math.random() * 100) + 10));

  const totalVotes = votes.reduce((a, b) => a + b, 0);

  const handleVote = (index: number) => {
    if (voted !== null) return;
    setVoted(index);
    setVotes(prev => prev.map((v, i) => i === index ? v + 1 : v));
    onVote?.(index);
  };

  return (
    <Card className="bg-card border-border/50 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-neon-violet" />
          <span className="text-xs font-medium text-neon-violet">POLL</span>
        </div>
        <p className="font-semibold text-foreground">{question}</p>
        <div className="space-y-2">
          {options.map((option, i) => {
            const pct = totalVotes > 0 ? Math.round((votes[i] / totalVotes) * 100) : 0;
            return (
              <button
                key={i}
                onClick={() => handleVote(i)}
                disabled={voted !== null}
                className="w-full relative"
              >
                <div className={`relative overflow-hidden rounded-lg border transition-all ${
                  voted === i ? 'border-primary bg-primary/10' : 'border-border/50 bg-secondary/30 hover:bg-secondary/50'
                }`}>
                  {voted !== null && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="absolute inset-0 bg-primary/15"
                    />
                  )}
                  <div className="relative px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-foreground">{option}</span>
                    {voted !== null && (
                      <span className="text-xs font-bold text-muted-foreground">{pct}%</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{totalVotes} votes</p>
      </CardContent>
    </Card>
  );
};

interface StatusHighlightProps {
  title: string;
  thumbnail: string;
  count: number;
}

export const StatusHighlight = ({ title, thumbnail, count }: StatusHighlightProps) => {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-primary via-neon-violet to-neon-cyan">
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-background">
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[64px]">{title}</span>
    </div>
  );
};

interface DuetStatusProps {
  user1: { name: string; avatar?: string };
  user2: { name: string; avatar?: string };
  image1: string;
  image2: string;
}

export const DuetStatus = ({ user1, user2, image1, image2 }: DuetStatusProps) => {
  return (
    <Card className="overflow-hidden border border-border/50 bg-card">
      <div className="flex">
        <div className="flex-1 aspect-[9/16] relative overflow-hidden">
          <img src={image1} alt={user1.name} className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-background/60 text-foreground backdrop-blur-sm text-[10px]">
              @{user1.name}
            </Badge>
          </div>
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1 aspect-[9/16] relative overflow-hidden">
          <img src={image2} alt={user2.name} className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-background/60 text-foreground backdrop-blur-sm text-[10px]">
              @{user2.name}
            </Badge>
          </div>
        </div>
      </div>
      <div className="p-2 flex items-center justify-center gap-1">
        <span className="text-xs text-neon-violet font-medium">🎭 Duet</span>
      </div>
    </Card>
  );
};
