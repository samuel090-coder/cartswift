import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ArrowLeft, User, Store, Save, Camera, Clock, CheckCircle, XCircle, 
  Loader2, Image, Sparkles, Heart, MapPin, Globe, Phone, Mail, Wallet, Plus, Users, Radio, Crown
} from 'lucide-react';
import Header from '@/components/Header';
import SellerApplicationForm from '@/components/seller/SellerApplicationForm';
import ApprovedSellerDashboard from '@/components/seller/ApprovedSellerDashboard';
import { motion } from 'framer-motion';
import StatusUploadModal from '@/components/StatusUploadModal';
import WalletCard from '@/components/wallet/WalletCard';
import StatusTabContent from '@/components/profile/StatusTabContent';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, ChevronRight, ShoppingBag, MessageCircle, Star, Gift } from 'lucide-react';
import { createSessionSupabaseClient, getSessionId } from '@/lib/sessionSupabase';
import profileGift from '@/assets/profile-gift.png';
const sessionClient = createSessionSupabaseClient();

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, updateProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'personal';
  const [editing, setEditing] = useState(false);
  const setTab = (tab: string) => setSearchParams(tab === 'personal' ? {} : { tab });
  const { data: accountSummary } = useQuery({
    queryKey: ['profile-summary', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const sessionId = getSessionId();
      const [orders, reviews, wallet, favorites] = await Promise.all([
        sessionClient.from('orders').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
        sessionClient.from('reviews').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
        supabase.from('wallets').select('balance, bonus_balance').eq('user_id', user?.id).maybeSingle(),
        sessionClient.from('wishlists').select('id, items(id, title, images, price)').eq('session_id', sessionId),
      ]);
      return { orders: orders.error ? null : orders.count, reviews: reviews.error ? null : reviews.count,
        balance: wallet.error ? null : (wallet.data?.balance || 0) + (wallet.data?.bonus_balance || 0),
        favorites: favorites.data || [] };
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    website: '',
    country: '',
    city: '',
    address: '',
  });

  // Fetch seller application status
  const { data: sellerApplication, isLoading: loadingApplication } = useQuery({
    queryKey: ['seller-application', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_applications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if user is an admin
  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', user?.email],
    queryFn: async () => {
      if (!user?.email) return false;
      const { data } = await supabase
        .from('allowed_admins')
        .select('email')
        .eq('email', user.email)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        website: profile.website || '',
        country: profile.country || '',
        city: profile.city || '',
        address: profile.address || '',
      });
    }
  }, [profile]);

  const handleImageUpload = async (file: File, type: 'avatar' | 'background') => {
    const setUploading = type === 'avatar' ? setUploadingAvatar : setUploadingBackground;
    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-files')
        .getPublicUrl(filePath);

      const updateData = type === 'avatar' 
        ? { avatar_url: publicUrl }
        : { background_image_url: publicUrl };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (updateError) throw updateError;

      toast.success(`${type === 'avatar' ? 'Profile photo' : 'Cover image'} updated! 💕`);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await updateProfile(formData);
    setIsSaving(false);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully!');
      setEditing(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-soft via-background to-peach/20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Render seller tab content based on application status
  const renderSellerContent = () => {
    if (loadingApplication) {
      return (
        <Card className="border-primary/10 bg-gradient-to-br from-background to-pink-soft/30">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4">Loading...</p>
          </CardContent>
        </Card>
      );
    }

    // Approved seller - show dashboard
    if (sellerApplication?.status === 'approved' || profile?.is_seller) {
      return <ApprovedSellerDashboard application={sellerApplication} />;
    }

    // Pending application - show status
    if (sellerApplication?.status === 'pending') {
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Application Under Review ⏳</h2>
              <Badge className="mb-4 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-sm px-4 py-1">
                Pending Review
              </Badge>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your seller application is being reviewed by our team. We'll notify you within 24-48 hours! 💕
              </p>
              <div className="mt-6 p-4 bg-background/80 rounded-xl text-left max-w-md mx-auto border border-amber-200">
                <p className="text-sm text-muted-foreground mb-2">📋 Application Details:</p>
                <p className="font-medium text-lg">{sellerApplication.store_name}</p>
                <p className="text-sm text-muted-foreground">
                  Submitted: {new Date(sellerApplication.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    // Rejected application - show status with option to reapply
    if (sellerApplication?.status === 'rejected') {
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-destructive/20 bg-gradient-to-br from-red-50/50 to-pink-50/30 dark:from-red-950/20 dark:to-pink-950/10">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-400 to-pink-500 rounded-full mb-4">
                <XCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Application Not Approved 😔</h2>
              <Badge variant="destructive" className="mb-4 text-sm px-4 py-1">Rejected</Badge>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                Unfortunately, your seller application was not approved at this time.
              </p>
              {sellerApplication.admin_notes && (
                <div className="p-4 bg-background/80 rounded-xl text-left max-w-md mx-auto mb-6 border border-destructive/20">
                  <p className="text-sm font-medium mb-1">📝 Reason:</p>
                  <p className="text-sm text-muted-foreground">{sellerApplication.admin_notes}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                You may submit a new application addressing the concerns mentioned above.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    // No application - show application form
    return <SellerApplicationForm />;
  };

  const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('en-US');
  const details = [
    { key: 'full_name', label: 'Full Name', value: formData.full_name || 'Add your name', icon: User, tone: 'rose' },
    { key: 'phone', label: 'Phone Number', value: formData.phone || 'Add phone number', icon: Phone, tone: 'green' },
    { key: 'email', label: 'Email Address', value: user?.email || '', icon: Mail, tone: 'blue' },
    { key: 'bio', label: 'Bio', value: formData.bio || 'Tell us a bit about yourself…', icon: Star, tone: 'gold' },
  ];
  const stats = [
    { label: 'Total Orders', value: number(accountSummary?.orders), icon: ShoppingBag, tone: 'rose', action: () => navigate('/orders') },
    { label: 'Wallet Balance', value: accountSummary?.balance == null ? '—' : '$' + accountSummary.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: Wallet, tone: 'green', action: () => setTab('wallet') },
    { label: 'Reviews', value: number(accountSummary?.reviews), icon: Star, tone: 'gold', action: () => setTab('reviews') },
    { label: 'Followers', value: number(profile?.followers_count || 0), icon: Users, tone: 'violet', action: () => navigate(`/user/${user?.id}`) },
  ];
  const shortcuts = [
    { label: 'My Orders', icon: ShoppingBag, tone: 'rose', action: () => navigate('/orders') },
    { label: 'My Wallet', icon: Wallet, tone: 'green', action: () => setTab('wallet') },
    { label: 'My Favorites', icon: Heart, tone: 'violet', action: () => setTab('wishlist') },
    { label: 'Messages', icon: MessageCircle, tone: 'blue', action: () => navigate('/messages') },
  ];

  return (
    <div className="profile-page min-h-screen bg-background text-foreground">
      <div className="hidden md:block"><Header /></div>
      <main className="relative mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6 sm:pt-10 pb-44">
        <section className="profile-identity relative mb-6 flex items-center gap-4 pr-9 sm:gap-6">
          <div className="relative shrink-0">
            <Avatar className="profile-avatar h-20 w-20 sm:h-28 sm:w-28 border-4 border-background ring-2 ring-primary/70 ring-offset-4 ring-offset-background">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Your profile'} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">{getInitials(profile?.full_name)}</AvatarFallback>
            </Avatar>
            <Button size="icon" aria-label="Change profile photo" title="Change profile photo" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-2 border-background">
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground sm:text-base">Hello,</p>
            <h1 className="mt-0.5 text-xl sm:text-3xl font-bold leading-tight break-words">{profile?.full_name || 'Your Profile'}</h1>
            {(sellerApplication?.status === 'approved' || profile?.is_seller) && <Badge className="mt-2 gap-1 rounded-full text-[10px] sm:text-xs"><CheckCircle className="h-3 w-3" /> Verified Seller</Badge>}
            {sellerApplication?.status === 'pending' && <Badge variant="secondary" className="mt-2 text-[10px]">Seller application pending</Badge>}
            <div className="mt-2 flex items-start gap-1.5 text-xs sm:text-sm text-muted-foreground"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-all">{user?.email}</span></div>
          </div>
          <Button variant="secondary" size="icon" aria-label="Edit profile" title="Edit profile" onClick={() => setEditing(true)} className="absolute right-0 top-0 h-9 w-9 rounded-lg"><Settings className="h-5 w-5" /></Button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'avatar')} />
        </section>

        <section aria-label="Account summary" className="profile-stat-strip grid grid-cols-4 rounded-lg border border-border py-4 mb-3">
          {stats.map(({ label, value, icon: Icon, tone, action }) => <Button key={label} variant="ghost" onClick={action} className="profile-stat h-auto min-w-0 flex-col items-start gap-1 rounded-none px-2 sm:px-5 border-r border-border last:border-0">
            <Icon className={'profile-tone-' + tone + ' h-5 w-5 mb-1'} />
            <span className="text-sm sm:text-xl font-bold max-w-full break-all">{value}</span>
            <span className="text-[10px] sm:text-xs leading-tight text-muted-foreground whitespace-normal text-left">{label}</span>
          </Button>)}
        </section>

        <section aria-label="Account shortcuts" className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
          {shortcuts.map(({ label, icon: Icon, tone, action }) => <Button key={label} variant="outline" onClick={action} className="profile-shortcut relative h-24 sm:h-28 min-w-0 flex-col items-start gap-3 rounded-lg px-2 sm:px-4">
            <span className={'profile-icon profile-icon-' + tone}><Icon className="h-5 w-5" /></span><ChevronRight className="absolute right-2 top-7 h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] sm:text-sm whitespace-normal text-left leading-tight">{label}</span>
          </Button>)}
        </section>

        <section className="profile-vip relative flex items-center gap-3 overflow-hidden rounded-lg border border-primary/20 p-4 sm:p-5 mb-5">
          <span className="profile-icon profile-icon-gold h-12 w-12 shrink-0"><Crown className="h-7 w-7" /></span>
          <div className="relative z-10 min-w-0 flex-1"><h2 className="font-bold text-base sm:text-xl">Become a VIP Member</h2><p className="mt-1 text-xs text-muted-foreground">Exclusive deals and more, just for you.</p><Button onClick={() => navigate('/subscriptions')} size="sm" className="mt-3 rounded-full gap-1 text-xs">Upgrade Now <ChevronRight className="h-3 w-3" /></Button></div>
          <img src={profileGift} alt="Pink gift box" width={512} height={512} className="w-20 sm:w-28 shrink-0 self-end object-contain" />
        </section>

        {isAdmin && <Button variant="outline" onClick={() => navigate('/admin/dashboard')} className="mb-4 w-full gap-2 text-neon-amber"><Crown className="h-4 w-4" /> Open Admin Panel</Button>}

        <Tabs value={activeTab} onValueChange={setTab} className="min-w-0">
          <TabsContent value="personal" className="mt-0">
            <section className="profile-information rounded-lg border border-border px-4 sm:px-6">
              <div className="flex items-center gap-3 py-5 border-b border-border"><span className="profile-icon profile-icon-rose shrink-0"><User className="h-6 w-6" /></span><div className="min-w-0"><h2 className="text-lg font-bold">Personal Information</h2><p className="text-xs text-muted-foreground mt-1">Your personal details and contact information</p></div></div>
              {details.map(({ key, label, value, icon: Icon, tone }) => <Button key={key} variant="ghost" onClick={() => setEditing(true)} className="h-auto w-full justify-start gap-3 rounded-none border-b border-border last:border-0 px-0 py-4 whitespace-normal text-left">
                <span className={'profile-icon profile-icon-' + tone + ' shrink-0'}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground mb-1">{label}</span><span className="block text-sm break-words [overflow-wrap:anywhere]">{value}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Button>)}
            </section>
          </TabsContent>
          <TabsContent value="wallet"><WalletCard /></TabsContent>
          <TabsContent value="status"><StatusTabContent /></TabsContent>
          <TabsContent value="seller">{renderSellerContent()}</TabsContent>
          <TabsContent value="wishlist"><h2 className="text-lg font-bold mb-4">My Favorites</h2><div className="grid grid-cols-2 gap-3">{accountSummary?.favorites.map(favorite => {
            const item = favorite.items;
            return item ? <Button key={favorite.id} variant="outline" onClick={() => navigate(`/share/${item.id}`)} className="h-auto flex-col items-start p-3 whitespace-normal text-left"><img src={item.images?.[0]} alt={item.title} className="aspect-square w-full object-cover rounded-md mb-3" /><span className="line-clamp-2">{item.title}</span></Button> : null;
          })}</div>{!accountSummary?.favorites.length && <p className="text-muted-foreground py-6 text-sm">No favorites yet.</p>}</TabsContent>
          <TabsContent value="reviews"><h2 className="text-lg font-bold">My Reviews</h2><p className="text-sm text-muted-foreground mt-2">{number(accountSummary?.reviews)} product reviews</p><Button variant="outline" onClick={() => navigate('/orders')} className="mt-4">View my orders <ChevronRight className="h-4 w-4 ml-2" /></Button></TabsContent>
          <TabsList className="mt-5 grid grid-cols-4 w-full bg-secondary/50 h-11">
            <TabsTrigger value="personal" className="text-xs gap-1"><User className="h-3 w-3" />Personal</TabsTrigger><TabsTrigger value="wallet" className="text-xs gap-1"><Wallet className="h-3 w-3" />Wallet</TabsTrigger><TabsTrigger value="status" className="text-xs gap-1"><Radio className="h-3 w-3" />Status</TabsTrigger><TabsTrigger value="seller" className="text-xs gap-1"><Store className="h-3 w-3" />Seller</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" className="mt-4 w-full gap-2" onClick={() => navigate('/rewards')}><Gift className="h-4 w-4 text-primary" />My Rewards<ChevronRight className="h-4 w-4 ml-auto" /></Button>
      </main>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto max-w-lg"><DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            {(['full_name', 'phone', 'bio', 'website', 'country', 'city', 'address'] as const).map(key => <div key={key} className="space-y-2"><Label htmlFor={key}>{({ full_name: 'Full Name', phone: 'Phone Number', bio: 'Bio', website: 'Website', country: 'Country', city: 'City', address: 'Address' })[key]}</Label>{key === 'bio' ? <Textarea id={key} value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} /> : <Input id={key} value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} />}</div>)}
            <Button variant="outline" disabled={uploadingBackground} onClick={() => backgroundInputRef.current?.click()} className="gap-2"><Image className="h-4 w-4" />{uploadingBackground ? 'Uploading…' : 'Change Cover'}</Button>
            <input ref={backgroundInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'background')} />
            <Button onClick={handleSave} disabled={isSaving} className="gap-2"><Save className="h-4 w-4" />{isSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
