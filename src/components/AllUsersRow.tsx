import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Verified, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const AllUsersRow = () => {
  // Fetch all users with profiles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('full_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading || users.length === 0) return null;

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <section className="py-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-4 px-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-pink-vibrant bg-clip-text text-transparent">
          ✨ People to Follow
        </h2>
        <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">
          {users.length} Users
        </Badge>
      </div>

      <div className="flex gap-5 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {users.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link 
              to={`/profile/${user.id}`}
              className="flex flex-col items-center gap-2 flex-shrink-0 group"
            >
              {/* Circular Avatar with Gradient Ring */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-primary via-pink-vibrant to-peach group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full bg-background p-0.5">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-sm font-bold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                
                {/* Verified Badge */}
                {user.seller_verified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                    <Verified className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="text-center max-w-[70px]">
                <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {user.full_name?.split(' ')[0] || 'User'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {user.followers_count || 0} followers
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default AllUsersRow;
