import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, User, Store, Save, Camera } from 'lucide-react';
import Header from '@/components/Header';

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
    is_seller: false,
    store_name: '',
    store_description: '',
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
        is_seller: profile.is_seller || false,
        store_name: profile.store_name || '',
        store_description: profile.store_description || '',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
            {profile?.is_seller && (
              <span className="inline-flex items-center px-2 py-1 mt-2 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                <Store className="w-3 h-3 mr-1" />
                Seller Account
              </span>
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
            <Card>
              <CardHeader>
                <CardTitle>Seller Account</CardTitle>
                <CardDescription>
                  Enable selling to list your products on CartSwift
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Enable Seller Account</h3>
                    <p className="text-sm text-muted-foreground">
                      Become a seller to list and sell your own products
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_seller}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_seller: checked })}
                  />
                </div>

                {formData.is_seller && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="store_name">Store Name</Label>
                      <Input
                        id="store_name"
                        value={formData.store_name}
                        onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                        placeholder="My Awesome Store"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="store_description">Store Description</Label>
                      <Textarea
                        id="store_description"
                        value={formData.store_description}
                        onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
                        placeholder="Describe what your store offers..."
                        rows={4}
                      />
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> Your seller account will be reviewed before you can start listing products.
                        This usually takes 1-2 business days.
                      </p>
                    </div>
                  </>
                )}

                <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
