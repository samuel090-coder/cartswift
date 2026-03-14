import { MessageCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  other_user?: { full_name: string | null; avatar_url: string | null; store_name: string | null };
  last_message?: string;
  unread_count?: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
}

const ConversationList = ({ conversations, onSelect }: ConversationListProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">Messages</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/seller')} className="text-xs gap-1">
          <Settings className="h-3 w-3" /> Auto-Reply
        </Button>
      </div>
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
          <MessageCircle className="h-12 w-12 mb-3" />
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Start a conversation from the Feed!</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {conversations.map(convo => (
            <button
              key={convo.id}
              onClick={() => onSelect(convo.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="relative">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={convo.other_user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {(convo.other_user?.full_name || 'U')[0]}
                  </AvatarFallback>
                </Avatar>
                {(convo.unread_count || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {convo.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {convo.other_user?.store_name || convo.other_user?.full_name || 'User'}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(convo.last_message_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {convo.last_message || 'No messages yet'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConversationList;
