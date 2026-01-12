import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Loader2, Image, Sparkles, Heart, MapPin, Globe, Phone, Mail, Wallet, Plus, Users
} from 'lucide-react';
import Header from '@/components/Header';
import SellerApplicationForm from '@/components/seller/SellerApplicationForm';
import ApprovedSellerDashboard from '@/components/seller/ApprovedSellerDashboard';
import { motion } from 'framer-motion';
import StatusUploadModal from '@/components/StatusUploadModal';
import WalletCard from '@/components/wallet/WalletCard';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, updateProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
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
      toast.success('Profile updated successfully! ✨');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-soft via-background to-peach/20">
      <Header />
      
      {/* Cover Image */}
      <div 
        className="h-40 md:h-56 bg-gradient-to-r from-primary/30 via-pink-medium/40 to-coral/30 relative"
        style={(profile as any)?.background_image_url ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.1)), url(${(profile as any).background_image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => backgroundInputRef.current?.click()}
          disabled={uploadingBackground}
          className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm hover:bg-white gap-2"
        >
          {uploadingBackground ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Image className="w-4 h-4" />
              Change Cover
            </>
          )}
        </Button>
        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'background')}
        />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm hover:bg-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-4xl pb-8">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-lg mb-6 bg-background/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background ring-4 ring-primary/20 shadow-lg">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-pink-vibrant text-white text-2xl font-bold">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'avatar')}
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{profile?.full_name || 'Your Profile'}</h1>
                    {(sellerApplication?.status === 'approved' || profile?.is_seller) && (
                      <Badge className="bg-gradient-to-r from-primary to-pink-vibrant text-white gap-1">
                        <Store className="w-3 h-3" />
                        Verified Seller
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {user?.email}
                    </span>
                    {profile?.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {profile.city}{profile.country && `, ${profile.country}`}
                      </span>
                    )}
                  </div>
                  
                  {sellerApplication?.status === 'pending' && (
                    <Badge className="mt-2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 gap-1">
                      <Clock className="w-3 h-3" />
                      Seller Application Pending
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Upload Section */}
        {((profile as any)?.followers_count || 0) > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card className="border-primary/10 bg-gradient-to-br from-background to-pink-soft/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-primary" />
                  Your Status Updates
                </CardTitle>
                <CardDescription>Share updates with your {(profile as any)?.followers_count || 0} followers</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowStatusModal(true)}
                  className="w-full gap-2 bg-gradient-to-r from-primary to-pink-vibrant hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                  Create New Status
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-background/80 backdrop-blur-sm border border-primary/20">
            <TabsTrigger value="personal" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <User className="w-4 h-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Wallet className="w-4 h-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="seller" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Store className="w-4 h-4" />
              Seller
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-primary/10 bg-gradient-to-br from-background to-pink-soft/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal details and contact information ✨
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Your beautiful name 💕"
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 234 567 8900"
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-primary" />
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us a bit about yourself... 🌟"
                      rows={3}
                      className="border-primary/20 focus:border-primary resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      Website
                    </Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://yourwebsite.com"
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Country
                      </Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="United States"
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="New York"
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Main St"
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    className="w-full md:w-auto bg-gradient-to-r from-primary to-pink-vibrant hover:opacity-90 gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Changes ✨'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="wallet">
            <WalletCard />
          </TabsContent>

          <TabsContent value="seller">
            {renderSellerContent()}
          </TabsContent>
        </Tabs>

        {/* Status Upload Modal */}
        {showStatusModal && (
          <StatusUploadModal 
            onClose={() => setShowStatusModal(false)} 
            onSuccess={() => setShowStatusModal(false)} 
          />
        )}
      </div>
    </div>
  );
};

export default Profile;
