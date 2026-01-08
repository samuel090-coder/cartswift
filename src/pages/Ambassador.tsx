import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Crown, Star, Users, DollarSign, Instagram, Twitter, Upload, FileText, Loader2, Clock, XCircle, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import { motion } from 'framer-motion';

const tierBenefits = {
  bronze: { discount: 10, commission: 10, color: 'bg-amber-700' },
  silver: { discount: 15, commission: 12, color: 'bg-gray-400' },
  gold: { discount: 20, commission: 15, color: 'bg-yellow-500' },
  platinum: { discount: 25, commission: 20, color: 'bg-purple-600' },
};

const idTypes = [
  { value: 'passport', label: 'International Passport' },
  { value: 'national_id', label: 'National ID Card' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'voters_card', label: "Voter's Card" },
  { value: 'residence_permit', label: 'Residence Permit' },
  { value: 'social_security', label: 'Social Security Card' },
];

const contentNiches = [
  'Fashion & Beauty',
  'Technology & Gadgets',
  'Fitness & Health',
  'Food & Cooking',
  'Travel & Adventure',
  'Gaming & Entertainment',
  'Lifestyle & Vlog',
  'Education & Learning',
  'Business & Finance',
  'Art & Design',
];

const Ambassador = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  
  // Form states
  const [step, setStep] = useState(1);
  const [socialHandles, setSocialHandles] = useState({
    instagram: '',
    twitter: '',
    tiktok: '',
    youtube: '',
    facebook: '',
  });
  const [followers, setFollowers] = useState({
    instagram: '',
    twitter: '',
    tiktok: '',
    youtube: '',
  });
  const [idType, setIdType] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [motivation, setMotivation] = useState('');
  const [promotionPlan, setPromotionPlan] = useState('');
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Fetch existing application
  const { data: application, isLoading: loadingApplication } = useQuery({
    queryKey: ['ambassador-application', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ambassador_applications')
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

  // Fetch approved ambassador
  const { data: ambassador } = useQuery({
    queryKey: ['ambassador', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ambassadors')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
    
    // Upload and scan
    setUploading(true);
    setScanning(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `ambassador-ids/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-files')
        .getPublicUrl(filePath);

      // Scan ID with AI
      const { data: scanResult, error: scanError } = await supabase.functions
        .invoke('scan-id-document', {
          body: { image_url: publicUrl }
        });

      if (scanError) throw scanError;

      if (scanResult?.success && scanResult?.data) {
        setScannedData({
          ...scanResult.data,
          documentUrl: publicUrl
        });
        toast.success('ID scanned successfully! Please verify the extracted information.');
      } else {
        setScannedData({ documentUrl: publicUrl });
        toast.info('ID uploaded. Please fill in your details manually.');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to upload/scan ID');
    } finally {
      setUploading(false);
      setScanning(false);
    }
  };

  const totalFollowers = () => {
    return Object.values(followers).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  };

  // Submit application
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in first');
      if (!scannedData?.documentUrl) throw new Error('Please upload your ID document');
      if (!agreedToTerms) throw new Error('Please agree to the terms');

      const { error } = await supabase
        .from('ambassador_applications')
        .insert({
          user_id: user.id,
          instagram_handle: socialHandles.instagram || null,
          instagram_followers: parseInt(followers.instagram) || null,
          twitter_handle: socialHandles.twitter || null,
          twitter_followers: parseInt(followers.twitter) || null,
          tiktok_handle: socialHandles.tiktok || null,
          tiktok_followers: parseInt(followers.tiktok) || null,
          youtube_channel: socialHandles.youtube || null,
          youtube_subscribers: parseInt(followers.youtube) || null,
          facebook_url: socialHandles.facebook || null,
          total_followers: totalFollowers(),
          content_niche: selectedNiches,
          motivation,
          promotion_plan: promotionPlan,
          id_type: idType,
          id_document_url: scannedData.documentUrl,
          id_scan_data: scannedData,
          full_name: scannedData.fullName || profile?.full_name,
          date_of_birth: scannedData.dateOfBirth,
          gender: scannedData.gender,
          country: scannedData.country || profile?.country,
          extracted_photo_url: scannedData.photoUrl,
          agreed_to_terms: agreedToTerms,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambassador-application'] });
      toast.success('Application submitted! We\'ll review it within 24-48 hours.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyCode = () => {
    if (ambassador) {
      navigator.clipboard.writeText(ambassador.ambassador_code);
      toast.success('Ambassador code copied!');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Crown className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl font-bold mb-4">Ambassador Program</h1>
          <p className="text-muted-foreground mb-6">Sign in to become a CartSwift Ambassador</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (loadingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Show approved ambassador dashboard
  if (ambassador?.is_approved) {
    const tier = ambassador.tier as keyof typeof tierBenefits;
    const benefits = tierBenefits[tier];

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="text-center mb-8">
            <div className={`w-20 h-20 ${benefits.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Ambassador Dashboard</h1>
            <Badge className={benefits.color + ' text-white text-lg px-4 py-1'}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Ambassador
            </Badge>
          </div>

          <Card className="mb-6">
            <CardContent className="p-6">
              <Label className="text-sm text-muted-foreground">Your Ambassador Code</Label>
              <div className="flex gap-2 mt-1">
                <Input value={ambassador.ambassador_code} readOnly className="font-mono text-lg font-bold" />
                <Button onClick={copyCode}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Share this code with your followers for {benefits.discount}% off their purchase
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-600">${Number(ambassador.total_sales || 0).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Sales Generated</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{benefits.commission}%</p>
                <p className="text-sm text-muted-foreground">Commission Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{ambassador.follower_count?.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show application status
  if (application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="p-8 text-center">
              {application.status === 'pending' ? (
                <>
                  <Clock className="w-16 h-16 mx-auto text-amber-500 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Application Under Review</h2>
                  <Badge className="mb-4 bg-amber-100 text-amber-700">Pending</Badge>
                  <p className="text-muted-foreground">
                    Your ambassador application is being reviewed. We'll notify you within 24-48 hours.
                  </p>
                </>
              ) : application.status === 'rejected' ? (
                <>
                  <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Application Not Approved</h2>
                  <Badge variant="destructive" className="mb-4">Rejected</Badge>
                  <p className="text-muted-foreground mb-4">
                    Unfortunately, your application was not approved.
                    {application.admin_notes && (
                      <span className="block mt-2"><strong>Reason:</strong> {application.admin_notes}</span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Application Approved!</h2>
                  <Badge className="mb-4 bg-green-100 text-green-700">Approved</Badge>
                  <p className="text-muted-foreground">Your ambassador account is being set up.</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Application Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Crown className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl font-bold mb-2">Become an Ambassador</h1>
          <p className="text-muted-foreground">
            Partner with CartSwift and earn commission while giving your followers exclusive discounts
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Social Media Presence'}
              {step === 2 && 'Identity Verification'}
              {step === 3 && 'Final Details'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about your social media accounts'}
              {step === 2 && 'Upload your ID for verification'}
              {step === 3 && 'Complete your application'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Instagram className="w-4 h-4" /> Instagram
                    </Label>
                    <Input
                      value={socialHandles.instagram}
                      onChange={(e) => setSocialHandles({ ...socialHandles, instagram: e.target.value })}
                      placeholder="@username"
                    />
                    <Input
                      type="number"
                      value={followers.instagram}
                      onChange={(e) => setFollowers({ ...followers, instagram: e.target.value })}
                      placeholder="Followers count"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Twitter className="w-4 h-4" /> Twitter/X
                    </Label>
                    <Input
                      value={socialHandles.twitter}
                      onChange={(e) => setSocialHandles({ ...socialHandles, twitter: e.target.value })}
                      placeholder="@username"
                    />
                    <Input
                      type="number"
                      value={followers.twitter}
                      onChange={(e) => setFollowers({ ...followers, twitter: e.target.value })}
                      placeholder="Followers count"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TikTok</Label>
                    <Input
                      value={socialHandles.tiktok}
                      onChange={(e) => setSocialHandles({ ...socialHandles, tiktok: e.target.value })}
                      placeholder="@username"
                    />
                    <Input
                      type="number"
                      value={followers.tiktok}
                      onChange={(e) => setFollowers({ ...followers, tiktok: e.target.value })}
                      placeholder="Followers count"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube</Label>
                    <Input
                      value={socialHandles.youtube}
                      onChange={(e) => setSocialHandles({ ...socialHandles, youtube: e.target.value })}
                      placeholder="Channel name"
                    />
                    <Input
                      type="number"
                      value={followers.youtube}
                      onChange={(e) => setFollowers({ ...followers, youtube: e.target.value })}
                      placeholder="Subscribers count"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Facebook Page URL (Optional)</Label>
                  <Input
                    value={socialHandles.facebook}
                    onChange={(e) => setSocialHandles({ ...socialHandles, facebook: e.target.value })}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Total Followers: <span className="text-primary">{totalFollowers().toLocaleString()}</span></p>
                </div>

                <div className="space-y-2">
                  <Label>Content Niche (Select up to 3)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {contentNiches.map((niche) => (
                      <div key={niche} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedNiches.includes(niche)}
                          onCheckedChange={(checked) => {
                            if (checked && selectedNiches.length < 3) {
                              setSelectedNiches([...selectedNiches, niche]);
                            } else if (!checked) {
                              setSelectedNiches(selectedNiches.filter(n => n !== niche));
                            }
                          }}
                        />
                        <span className="text-sm">{niche}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={() => setStep(2)} className="w-full" disabled={totalFollowers() < 1000}>
                  {totalFollowers() < 1000 ? 'Minimum 1,000 followers required' : 'Continue'}
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>ID Document Type</Label>
                    <Select value={idType} onValueChange={setIdType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        {idTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Upload ID Document</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Upload a clear photo or scan of your ID. Our AI will extract your information automatically.
                    </p>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      {idPreview ? (
                        <div className="space-y-4">
                          <img src={idPreview} alt="ID Preview" className="max-h-48 mx-auto rounded-lg" />
                          {scanning && (
                            <div className="flex items-center justify-center gap-2 text-primary">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Scanning document...</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload or drag & drop</p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleIdUpload}
                            className="hidden"
                            disabled={!idType}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {scannedData && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-2">
                      <p className="font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Information Extracted
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Name:</span> {scannedData.fullName || 'N/A'}</div>
                        <div><span className="text-muted-foreground">DOB:</span> {scannedData.dateOfBirth || 'N/A'}</div>
                        <div><span className="text-muted-foreground">Gender:</span> {scannedData.gender || 'N/A'}</div>
                        <div><span className="text-muted-foreground">Country:</span> {scannedData.country || 'N/A'}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={() => setStep(3)} 
                    className="flex-1" 
                    disabled={!scannedData?.documentUrl}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Why do you want to become an Ambassador?</Label>
                    <Textarea
                      value={motivation}
                      onChange={(e) => setMotivation(e.target.value)}
                      placeholder="Tell us what excites you about the CartSwift Ambassador program..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>How will you promote CartSwift?</Label>
                    <Textarea
                      value={promotionPlan}
                      onChange={(e) => setPromotionPlan(e.target.value)}
                      placeholder="Describe your content strategy and how you plan to share CartSwift with your audience..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    />
                    <span className="text-sm">
                      I agree to the Ambassador Program terms and conditions, including the commission structure and promotional guidelines.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={() => submitMutation.mutate()} 
                    className="flex-1"
                    disabled={submitMutation.isPending || !agreedToTerms || !motivation}
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tier Benefits Preview */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-center mb-4">Ambassador Tiers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(tierBenefits).map(([tier, benefits]) => (
              <Card key={tier} className="text-center p-3">
                <div className={`w-8 h-8 ${benefits.color} rounded-full mx-auto mb-2`} />
                <p className="font-medium capitalize text-sm">{tier}</p>
                <p className="text-xs text-muted-foreground">{benefits.discount}% discount</p>
                <p className="text-xs text-muted-foreground">{benefits.commission}% commission</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ambassador;
