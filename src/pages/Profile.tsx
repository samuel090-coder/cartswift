import { useState, useEffect } from 'react';
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
import { ArrowLeft, User, Store, Save, Camera, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import SellerApplicationForm from '@/components/seller/SellerApplicationForm';
import ApprovedSellerDashboard from '@/components/seller/ApprovedSellerDashboard';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, updateProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
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

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await updateProfile(formData);
    setIsSaving(false);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully!');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render seller tab content based on application status
  const renderSellerContent = () => {
    if (loadingApplication) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
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
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-8 text-center">
            <Clock className="w-16 h-16 mx-auto text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Under Review</h2>
            <Badge className="mb-4 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              Pending Review
            </Badge>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your seller application is being reviewed by our team. We'll notify you within 24-48 hours.
            </p>
            <div className="mt-6 p-4 bg-background/80 rounded-lg text-left max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-2">Application Details:</p>
              <p className="font-medium">{sellerApplication.store_name}</p>
              <p className="text-sm text-muted-foreground">
                Submitted: {new Date(sellerApplication.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Rejected application - show status with option to reapply
    if (sellerApplication?.status === 'rejected') {
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Not Approved</h2>
            <Badge variant="destructive" className="mb-4">Rejected</Badge>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Unfortunately, your seller application was not approved at this time.
            </p>
            {sellerApplication.admin_notes && (
              <div className="p-4 bg-background/80 rounded-lg text-left max-w-md mx-auto mb-6">
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground">{sellerApplication.admin_notes}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              You may submit a new application addressing the concerns mentioned above.
            </p>
          </CardContent>
        </Card>
      );
    }

    // No application - show application form
    return <SellerApplicationForm />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shopping
        </Button>

        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.full_name || 'Your Profile'}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
            {(sellerApplication?.status === 'approved' || profile?.is_seller) && (
              <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <Store className="w-3 h-3 mr-1" />
                Verified Seller
              </Badge>
            )}
            {sellerApplication?.status === 'pending' && (
              <Badge className="mt-2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <Clock className="w-3 h-3 mr-1" />
                Seller Application Pending
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="seller" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Seller Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us a bit about yourself..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="United States"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="New York"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main St"
                    />
                  </div>
                </div>

                <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seller">
            {renderSellerContent()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;