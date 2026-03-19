import { MessageCircle, Search, Settings, Store, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface DiscoverProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  store_name: string | null;
  bio: string | null;
  is_seller: boolean | null;
  seller_application_approved: boolean | null;
  seller_verified: boolean | null;
  followers_count: number | null;
  total_sales: number | null;
}

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  topSellers: DiscoverProfile[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchResults: DiscoverProfile[];
  onStartConversation: (userId: string) => void;
  isSearching?: boolean;
}

const getInitials = (name: string | null) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const ConversationList = ({
  conversations,
  onSelect,
  topSellers,
  searchQuery,
  onSearchChange,
  searchResults,
  onStartConversation,
  isSearching = false,
}: ConversationListProps) => {
  const navigate = useNavigate();
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <h1 className="text-lg font-bold text-foreground">Messages</h1>
          <p className="text-xs text-muted-foreground">Search anyone or start with top sellers.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/seller')} className="text-xs gap-1 shrink-0">
          <Settings className="h-3 w-3" /> Auto-Reply
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search people or sellers to message"
              className="pl-10"
            />
          </div>

          {hasSearch ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Search results</h2>
                {isSearching && <span className="text-xs text-muted-foreground">Searching...</span>}
              </div>

              {searchResults.length === 0 && !isSearching ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-foreground">No people found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try another name or store.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((profile) => {
                    const displayName = profile.store_name || profile.full_name || 'User';
                    const isSeller = !!(profile.is_seller || profile.seller_application_approved || profile.store_name);

                    return (
                      <div key={profile.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${profile.id}`)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <Avatar className="h-11 w-11 border border-border">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
                              {isSeller && <Badge variant="secondary">Seller</Badge>}
                              {profile.seller_verified && <Badge className="bg-primary text-primary-foreground">Verified</Badge>}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {profile.bio || (isSeller ? 'Open seller profile' : 'Start chatting instantly')}
                            </p>
                          </div>
                        </button>
                        <Button size="sm" className="gap-1 shrink-0" onClick={() => onStartConversation(profile.id)}>
                          <MessageCircle className="h-4 w-4" /> Message
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Top sellers</h2>
                  <span className="text-xs text-muted-foreground">Start a chat instantly</span>
                </div>

                {topSellers.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    No sellers available yet.
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {topSellers.map((seller) => {
                      const displayName = seller.store_name || seller.full_name || 'Seller';

                      return (
                        <div key={seller.id} className="min-w-[220px] rounded-2xl border border-border bg-card p-4">
                          <button
                            type="button"
                            onClick={() => navigate(`/profile/${seller.id}`)}
                            className="w-full text-left"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12 border border-border">
                                <AvatarImage src={seller.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getInitials(displayName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                                  {seller.seller_verified && <Badge className="bg-primary text-primary-foreground">Verified</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {seller.followers_count ?? 0} followers • {seller.total_sales ?? 0} sales
                                </p>
                              </div>
                            </div>
                          </button>

                          <div className="mt-4 flex items-center gap-2">
                            <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => navigate(`/profile/${seller.id}`)}>
                              <Store className="h-4 w-4" /> View
                            </Button>
                            <Button size="sm" className="flex-1 gap-1" onClick={() => onStartConversation(seller.id)}>
                              <MessageCircle className="h-4 w-4" /> Message
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Recent chats</h2>
                  {conversations.length > 0 && (
                    <span className="text-xs text-muted-foreground">Tap a chat to continue</span>
                  )}
                </div>

                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mb-3" />
                    <p className="text-sm text-foreground">No messages yet</p>
                    <p className="text-xs mt-1">Pick a seller above or search for anyone.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {conversations.map((convo) => (
                      <button
                        key={convo.id}
                        onClick={() => onSelect(convo.id)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border border-border">
                            <AvatarImage src={convo.other_user?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(convo.other_user?.store_name || convo.other_user?.full_name || 'User')}
                            </AvatarFallback>
                          </Avatar>
                          {(convo.unread_count || 0) > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
                              {convo.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
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
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
