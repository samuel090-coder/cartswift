import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import StatusViewer from './StatusViewer';
import StatusUploadModal from './StatusUploadModal';
import { useAuth } from '@/contexts/AuthContext';

interface StatusUser {
  id: string;
  user_id: string;
  avatar_url: string | null;
  full_name: string | null;
  store_name: string | null;
  statuses: any[];
  hasUnviewed: boolean;
}

const StatusBar = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<StatusUser | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Fetch users with active statuses (from people the user follows or all if not logged in)
  const { data: statusUsers = [], refetch } = useQuery({
    queryKey: ['status-users', user?.id],
    queryFn: async () => {
      // Get active statuses from users
      const { data: statuses, error } = await supabase
        .from('user_statuses')
        .select('*, profiles:user_id(id, full_name, store_name, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group statuses by user
      const userMap = new Map<string, StatusUser>();
      
      statuses?.forEach((status: any) => {
        const userId = status.user_id;
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            user_id: userId,
            avatar_url: status.profiles?.avatar_url,
            full_name: status.profiles?.full_name,
            store_name: status.profiles?.store_name,
            statuses: [],
            hasUnviewed: true
          });
        }
        userMap.get(userId)!.statuses.push(status);
      });

      return Array.from(userMap.values());
    },
  });

  // Check if current user has statuses
  const { data: myStatuses = [] } = useQuery({
    queryKey: ['my-statuses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_statuses')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Check if user has followers (can post status)
  const { data: profile } = useQuery({
    queryKey: ['my-profile-followers', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('followers_count, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const canPostStatus = profile?.followers_count && profile.followers_count > 0;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (statusUsers.length === 0 && !user) return null;

  return (
    <>
      <div className="py-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-2">
          {/* Add Status Button (for users with followers) */}
          {user && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className="relative">
                <button
                  onClick={() => myStatuses.length > 0 
                    ? setSelectedUser({
                        id: user.id,
                        user_id: user.id,
                        avatar_url: null,
                        full_name: 'My Status',
                        store_name: null,
                        statuses: myStatuses,
                        hasUnviewed: false
                      })
                    : canPostStatus && setShowUploadModal(true)
                  }
                  className="relative"
                >
                  <div className={`w-16 h-16 rounded-full p-0.5 ${
                    myStatuses.length > 0 
                      ? 'bg-gradient-to-tr from-primary via-pink-vibrant to-peach' 
                      : 'bg-muted'
                  }`}>
                    <div className="w-full h-full rounded-full bg-background p-0.5">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-sm">
                          {getInitials('You')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  {canPostStatus && myStatuses.length === 0 && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {myStatuses.length > 0 && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center border-2 border-background text-[10px] text-white font-bold">
                      {myStatuses.length}
                    </div>
                  )}
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-16 text-center">
                {myStatuses.length > 0 ? 'My Status' : canPostStatus ? 'Add Status' : 'Get Followers'}
              </span>
            </motion.div>
          )}

          {/* Other Users' Statuses */}
          {statusUsers.filter(u => u.user_id !== user?.id).map((statusUser, index) => (
            <motion.div
              key={statusUser.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <button
                onClick={() => setSelectedUser(statusUser)}
                className="relative"
              >
                <div className={`w-16 h-16 rounded-full p-0.5 ${
                  statusUser.hasUnviewed 
                    ? 'bg-gradient-to-tr from-primary via-pink-vibrant to-peach animate-pulse' 
                    : 'bg-muted/50'
                }`}>
                  <div className="w-full h-full rounded-full bg-background p-0.5">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={statusUser.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-sm">
                        {getInitials(statusUser.store_name || statusUser.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                {statusUser.statuses.length > 1 && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center border-2 border-background text-[10px] text-white font-bold">
                    {statusUser.statuses.length}
                  </div>
                )}
              </button>
              <span className="text-[10px] text-muted-foreground truncate w-16 text-center">
                {statusUser.store_name || statusUser.full_name?.split(' ')[0] || 'User'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Status Viewer Modal */}
      {selectedUser && (
        <StatusViewer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onNext={() => {
            const currentIndex = statusUsers.findIndex(u => u.id === selectedUser.id);
            if (currentIndex < statusUsers.length - 1) {
              setSelectedUser(statusUsers[currentIndex + 1]);
            } else {
              setSelectedUser(null);
            }
          }}
        />
      )}

      {/* Status Upload Modal */}
      {showUploadModal && (
        <StatusUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            refetch();
          }}
        />
      )}
    </>
  );
};

export default StatusBar;
