import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Store, FileText, CreditCard, Globe, Upload, User, MapPin, 
  ShieldCheck, Loader2, CheckCircle, AlertCircle, Camera, BadgeCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categories = ['Fashion', 'Animals', 'Tools', 'Vehicles', 'Books'] as const;

const businessTypes = [
  { value: 'individual', label: 'Individual / Sole Proprietor' },
  { value: 'registered_business', label: 'Registered Business' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
];

const productSources = [
  { value: 'manufacturer', label: 'I manufacture my own products' },
  { value: 'wholesale', label: 'I buy wholesale and resell' },
  { value: 'handmade', label: 'I create handmade products' },
  { value: 'dropship', label: 'Dropshipping' },
  { value: 'mix', label: 'Mix of sources' },
];

const payoutMethods = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'crypto', label: 'Cryptocurrency' },
];

const idTypes = [
  { value: 'passport', label: 'International Passport' },
  { value: 'national_id', label: 'National ID Card' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'voters_card', label: "Voter's Card" },
  { value: 'residence_permit', label: 'Residence Permit' },
];

const SellerApplicationForm = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [idPreview, setIdPreview] = useState('');
  
  const [formData, setFormData] = useState({
    // Personal Info
    full_name: profile?.full_name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    date_of_birth: '',
    gender: '',
    // ID Verification
    id_type: '',
    id_document_url: '',
    // Address
    country: profile?.country || '',
    state: '',
    city: profile?.city || '',
    address: profile?.address || '',
    postal_code: '',
    // Business
    store_name: profile?.store_name || '',
    store_description: profile?.store_description || '',
    business_type: 'individual',
    business_registration_number: '',
    tax_id: '',
    // Products
    product_categories: [] as string[],
    estimated_monthly_products: '',
    product_source: '',
    // Payment
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    routing_number: '',
    paypal_email: '',
    crypto_wallet: '',
    preferred_payout_method: 'bank_transfer',
    // Social
    website_url: '',
    instagram_handle: '',
    facebook_url: '',
    // Agreement
    agreed_to_terms: false,
    agreed_to_commission: false,
  });

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdPreview(URL.createObjectURL(file));
    setUploading(true);
    setScanning(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `seller-ids/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-files')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, id_document_url: publicUrl }));

      // Scan ID with AI
      const { data: scanResult, error: scanError } = await supabase.functions
        .invoke('scan-id-document', {
          body: { image_url: publicUrl }
        });

      if (scanError) throw scanError;

      if (scanResult?.success && scanResult?.data) {
        setScannedData(scanResult.data);
        // Auto-fill form with scanned data
        setFormData(prev => ({
          ...prev,
          full_name: scanResult.data.full_name || prev.full_name,
          date_of_birth: scanResult.data.date_of_birth || prev.date_of_birth,
          gender: scanResult.data.gender || prev.gender,
          country: scanResult.data.country || prev.country,
        }));
        toast.success('ID scanned successfully! Please verify the extracted information.');
      } else {
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

  const submitApplication = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in first');
      if (!formData.id_document_url) throw new Error('Please upload your ID document');
      
      const { error } = await supabase
        .from('seller_applications')
        .insert({
          user_id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          id_document_url: formData.id_document_url,
          country: formData.country,
          state: formData.state,
          city: formData.city,
          address: formData.address,
          postal_code: formData.postal_code || null,
          store_name: formData.store_name,
          store_description: formData.store_description,
          business_type: formData.business_type,
          business_registration_number: formData.business_registration_number || null,
          tax_id: formData.tax_id || null,
          product_categories: formData.product_categories,
          estimated_monthly_products: parseInt(formData.estimated_monthly_products) || null,
          product_source: formData.product_source || null,
          bank_name: formData.bank_name || null,
          account_holder_name: formData.account_holder_name || null,
          account_number: formData.account_number || null,
          routing_number: formData.routing_number || null,
          paypal_email: formData.paypal_email || null,
          crypto_wallet: formData.crypto_wallet || null,
          preferred_payout_method: formData.preferred_payout_method,
          website_url: formData.website_url || null,
          instagram_handle: formData.instagram_handle || null,
          facebook_url: formData.facebook_url || null,
          agreed_to_terms: formData.agreed_to_terms,
          agreed_to_commission: formData.agreed_to_commission,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-application'] });
      toast.success('Application submitted successfully! We will review it within 24-48 hours.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      product_categories: prev.product_categories.includes(category)
        ? prev.product_categories.filter(c => c !== category)
        : [...prev.product_categories, category]
    }));
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.full_name || !formData.email || !formData.phone) {
          toast.error('Please fill in all required personal information');
          return false;
        }
        if (!formData.id_document_url) {
          toast.error('Please upload your ID document for verification');
          return false;
        }
        break;
      case 2:
        if (!formData.country || !formData.state || !formData.city || !formData.address) {
          toast.error('Please fill in all required address information');
          return false;
        }
        break;
      case 3:
        if (!formData.store_name || !formData.store_description || formData.product_categories.length === 0) {
          toast.error('Please fill in store name, description, and select at least one category');
          return false;
        }
        break;
      case 4:
        if (!formData.preferred_payout_method) {
          toast.error('Please select a payout method');
          return false;
        }
        if (formData.preferred_payout_method === 'bank_transfer' && (!formData.bank_name || !formData.account_number)) {
          toast.error('Please fill in bank details');
          return false;
        }
        if (formData.preferred_payout_method === 'paypal' && !formData.paypal_email) {
          toast.error('Please enter your PayPal email');
          return false;
        }
        if (formData.preferred_payout_method === 'crypto' && !formData.crypto_wallet) {
          toast.error('Please enter your crypto wallet address');
          return false;
        }
        break;
      case 5:
        if (!formData.agreed_to_terms || !formData.agreed_to_commission) {
          toast.error('You must agree to the terms and commission structure');
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    if (validateStep()) {
      submitApplication.mutate();
    }
  };

  const stepConfig = [
    { icon: User, label: 'Identity', desc: 'Personal details & ID verification' },
    { icon: MapPin, label: 'Address', desc: 'Location information' },
    { icon: Store, label: 'Store', desc: 'Business & products' },
    { icon: CreditCard, label: 'Payment', desc: 'Payout preferences' },
    { icon: ShieldCheck, label: 'Review', desc: 'Terms & submit' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
          <BadgeCheck className="w-4 h-4" />
          Become a Verified Seller
        </div>
        <h1 className="text-3xl font-bold mb-2">Start Selling on CartSwift</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Complete your application to join thousands of successful sellers. We review applications within 24-48 hours.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {stepConfig.map((s, i) => {
          const StepIcon = s.icon;
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isComplete = step > stepNum;
          
          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isComplete ? 'bg-green-500 text-white' :
                    isActive ? 'bg-primary text-primary-foreground shadow-lg scale-110' : 
                    'bg-muted text-muted-foreground'
                  }`}
                  animate={{ scale: isActive ? 1.1 : 1 }}
                >
                  {isComplete ? <CheckCircle className="w-6 h-6" /> : <StepIcon className="w-5 h-5" />}
                </motion.div>
                <span className={`text-xs mt-2 font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < 4 && (
                <div className={`w-8 md:w-16 lg:w-24 h-1 mx-1 ${step > stepNum ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1: Personal Info & ID */}
          {step === 1 && (
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Personal Information & Identity Verification
                </CardTitle>
                <CardDescription>
                  We need to verify your identity to protect buyers and maintain trust on our platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* ID Upload Section */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-6 border-2 border-dashed border-amber-300 dark:border-amber-700">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                      <Camera className="w-8 h-8 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Upload Your ID Document</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload a clear photo of your government-issued ID. Our AI will automatically extract your information.
                      </p>
                      
                      <div className="space-y-3">
                        <Select 
                          value={formData.id_type} 
                          onValueChange={(val) => setFormData({ ...formData, id_type: val })}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select ID type" />
                          </SelectTrigger>
                          <SelectContent>
                            {idTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <div className="flex gap-3">
                          <label className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleIdUpload}
                              className="hidden"
                              disabled={uploading}
                            />
                            <div className="flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
                              {uploading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Upload className="w-5 h-5" />
                              )}
                              {uploading ? 'Uploading...' : 'Choose File'}
                            </div>
                          </label>
                        </div>
                        
                        {idPreview && (
                          <div className="relative">
                            <img 
                              src={idPreview} 
                              alt="ID Preview" 
                              className="w-full max-w-xs rounded-lg border-2 border-green-500"
                            />
                            {scanning && (
                              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                <div className="text-white text-center">
                                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                  <p>AI is scanning your ID...</p>
                                </div>
                              </div>
                            )}
                            {scannedData && !scanning && (
                              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Verified
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name (as on ID) *</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="John Doe"
                      className={scannedData?.full_name ? 'border-green-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className={scannedData?.date_of_birth ? 'border-green-500' : ''}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(val) => setFormData({ ...formData, gender: val })}
                  >
                    <SelectTrigger className={scannedData?.gender ? 'border-green-500' : ''}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scannedData && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">ID Verified Successfully</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      Your information has been extracted from your ID. Please verify the details above are correct.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Address Information
                </CardTitle>
                <CardDescription>Where are you located?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country *</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="United States"
                      className={scannedData?.country ? 'border-green-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State/Province *</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="California"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Los Angeles"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      placeholder="90001"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Street Address *</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Store & Products */}
          {step === 3 && (
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  Store & Products
                </CardTitle>
                <CardDescription>Tell us about your store and what you'll sell</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label>Store Name *</Label>
                  <Input
                    value={formData.store_name}
                    onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                    placeholder="My Awesome Store"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Store Description *</Label>
                  <Textarea
                    value={formData.store_description}
                    onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
                    placeholder="Describe what makes your store unique and what products you'll be selling..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Type *</Label>
                  <Select 
                    value={formData.business_type} 
                    onValueChange={(val) => setFormData({ ...formData, business_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.business_type !== 'individual' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label>Business Registration Number</Label>
                      <Input
                        value={formData.business_registration_number}
                        onChange={(e) => setFormData({ ...formData, business_registration_number: e.target.value })}
                        placeholder="REG123456"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax ID / VAT Number</Label>
                      <Input
                        value={formData.tax_id}
                        onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Product Categories * (Select all that apply)</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        type="button"
                        variant={formData.product_categories.includes(cat) ? 'default' : 'outline'}
                        onClick={() => handleCategoryToggle(cat)}
                        size="sm"
                        className="transition-all"
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product Source</Label>
                    <Select 
                      value={formData.product_source} 
                      onValueChange={(val) => setFormData({ ...formData, product_source: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {productSources.map((source) => (
                          <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Monthly Products</Label>
                    <Input
                      type="number"
                      value={formData.estimated_monthly_products}
                      onChange={(e) => setFormData({ ...formData, estimated_monthly_products: e.target.value })}
                      placeholder="How many products per month?"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Payment */}
          {step === 4 && (
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payment Information
                </CardTitle>
                <CardDescription>How would you like to receive your earnings?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label>Preferred Payout Method *</Label>
                  <Select 
                    value={formData.preferred_payout_method} 
                    onValueChange={(val) => setFormData({ ...formData, preferred_payout_method: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {payoutMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.preferred_payout_method === 'bank_transfer' && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bank Name *</Label>
                        <Input
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          placeholder="Bank of America"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input
                          value={formData.account_holder_name}
                          onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Account Number *</Label>
                        <Input
                          value={formData.account_number}
                          onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                          placeholder="XXXXXXXXXXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Routing Number / SWIFT</Label>
                        <Input
                          value={formData.routing_number}
                          onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                          placeholder="XXXXXXXXX"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.preferred_payout_method === 'paypal' && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label>PayPal Email *</Label>
                      <Input
                        type="email"
                        value={formData.paypal_email}
                        onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                        placeholder="paypal@example.com"
                      />
                    </div>
                  </div>
                )}

                {formData.preferred_payout_method === 'crypto' && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label>Crypto Wallet Address (USDT/USDC) *</Label>
                      <Input
                        value={formData.crypto_wallet}
                        onChange={(e) => setFormData({ ...formData, crypto_wallet: e.target.value })}
                        placeholder="0x..."
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Website (optional)</Label>
                    <Input
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      placeholder="https://mystore.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram (optional)</Label>
                    <Input
                      value={formData.instagram_handle}
                      onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                      placeholder="@mystore"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook (optional)</Label>
                    <Input
                      value={formData.facebook_url}
                      onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                      placeholder="facebook.com/mystore"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Review & Submit */}
          {step === 5 && (
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Review & Submit
                </CardTitle>
                <CardDescription>Review your application and accept our terms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Application Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Application Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {formData.full_name}</div>
                    <div><span className="text-muted-foreground">Email:</span> {formData.email}</div>
                    <div><span className="text-muted-foreground">Store:</span> {formData.store_name}</div>
                    <div><span className="text-muted-foreground">Location:</span> {formData.city}, {formData.country}</div>
                    <div><span className="text-muted-foreground">Categories:</span> {formData.product_categories.join(', ')}</div>
                    <div><span className="text-muted-foreground">Payout:</span> {formData.preferred_payout_method}</div>
                  </div>
                </div>

                {/* Commission Structure */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-3">Commission Structure</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Platform Commission</span>
                      <span className="font-medium">12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Your Earnings</span>
                      <span className="font-medium text-green-600">88%</span>
                    </div>
                    <div className="border-t border-amber-200 dark:border-amber-700 pt-2 mt-2 text-muted-foreground">
                      Example: For a $100 sale, you receive $88
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={formData.agreed_to_terms}
                      onCheckedChange={(checked) => setFormData({ ...formData, agreed_to_terms: checked as boolean })}
                    />
                    <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      I agree to the <span className="text-primary underline">Seller Terms of Service</span> and <span className="text-primary underline">Privacy Policy</span>. I confirm that all information provided is accurate and I am authorized to sell the products listed.
                    </label>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="commission"
                      checked={formData.agreed_to_commission}
                      onCheckedChange={(checked) => setFormData({ ...formData, agreed_to_commission: checked as boolean })}
                    />
                    <label htmlFor="commission" className="text-sm leading-relaxed cursor-pointer">
                      I understand and agree to the 12% commission structure. I acknowledge that CartSwift may update fees with 30 days notice.
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>What happens next?</strong>
                    <p className="mt-1 text-blue-700 dark:text-blue-300">
                      Our team will review your application within 24-48 hours. You'll receive an email notification once approved. After approval, you can start adding products immediately.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 1}
          className="gap-2"
        >
          Previous
        </Button>
        
        {step < 5 ? (
          <Button onClick={nextStep} className="gap-2">
            Continue
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={submitApplication.isPending || !formData.agreed_to_terms || !formData.agreed_to_commission}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {submitApplication.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Submit Application
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SellerApplicationForm;