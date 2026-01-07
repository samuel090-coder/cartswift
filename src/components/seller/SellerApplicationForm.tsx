import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Store, FileText, CreditCard, Globe, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

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

const SellerApplicationForm = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Info
    full_name: profile?.full_name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    date_of_birth: '',
    gender: '',
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

  const submitApplication = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in first');
      
      const { error } = await supabase
        .from('seller_applications')
        .insert({
          user_id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
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
      toast.success('Application submitted successfully! We will review it shortly.');
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

  const stepIcons = [
    <FileText className="w-5 h-5" />,
    <Globe className="w-5 h-5" />,
    <Store className="w-5 h-5" />,
    <CreditCard className="w-5 h-5" />,
    <FileText className="w-5 h-5" />,
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {stepIcons[s - 1]}
            </div>
            {s < 5 && (
              <div className={`w-12 md:w-24 h-1 ${s < step ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
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
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                  <SelectTrigger>
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
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>Where are you located?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="United States"
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

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Store & Products</CardTitle>
              <CardDescription>Tell us about your store and what you'll sell</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  placeholder="Describe what makes your store unique..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Type *</Label>
                <Select value={formData.business_type} onValueChange={(val) => setFormData({ ...formData, business_type: val })}>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Source</Label>
                  <Select value={formData.product_source} onValueChange={(val) => setFormData({ ...formData, product_source: val })}>
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
                    placeholder="10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>How would you like to receive payments?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred Payout Method *</Label>
                <Select value={formData.preferred_payout_method} onValueChange={(val) => setFormData({ ...formData, preferred_payout_method: val })}>
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
                <div className="space-y-4 p-4 bg-muted rounded-lg">
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
                      <Label>Routing Number</Label>
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
                <div className="p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label>PayPal Email *</Label>
                    <Input
                      type="email"
                      value={formData.paypal_email}
                      onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                      placeholder="john@paypal.com"
                    />
                  </div>
                </div>
              )}

              {formData.preferred_payout_method === 'crypto' && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label>Crypto Wallet Address (ETH/USDT) *</Label>
                    <Input
                      value={formData.crypto_wallet}
                      onChange={(e) => setFormData({ ...formData, crypto_wallet: e.target.value })}
                      placeholder="0x..."
                    />
                  </div>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <Label className="text-muted-foreground text-sm">Social Media & Website (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <Input
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="Website URL"
                  />
                  <Input
                    value={formData.instagram_handle}
                    onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                    placeholder="Instagram @handle"
                  />
                  <Input
                    value={formData.facebook_url}
                    onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                    placeholder="Facebook URL"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Agreement</CardTitle>
              <CardDescription>Review your application and agree to our terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Store Name</p>
                  <p className="font-medium">{formData.store_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Business Type</p>
                  <p className="font-medium">{businessTypes.find(b => b.value === formData.business_type)?.label}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="font-medium">{formData.product_categories.join(', ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payout Method</p>
                  <p className="font-medium">{payoutMethods.find(p => p.value === formData.preferred_payout_method)?.label}</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Commission Structure</h4>
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  CartSwift charges a <strong>12% commission</strong> on each sale. This covers payment processing, 
                  platform maintenance, and customer support. You will receive 88% of each sale directly to your 
                  preferred payout method.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={formData.agreed_to_terms}
                    onCheckedChange={(checked) => setFormData({ ...formData, agreed_to_terms: checked as boolean })}
                  />
                  <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    I agree to the CartSwift Seller Terms of Service and Privacy Policy. I understand that my 
                    application will be reviewed and I will be notified of the decision via email.
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="commission"
                    checked={formData.agreed_to_commission}
                    onCheckedChange={(checked) => setFormData({ ...formData, agreed_to_commission: checked as boolean })}
                  />
                  <label htmlFor="commission" className="text-sm leading-relaxed cursor-pointer">
                    I understand and agree to the 12% commission structure on all sales made through the CartSwift platform.
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={prevStep} disabled={step === 1}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        {step < 5 ? (
          <Button onClick={nextStep}>
            Next Step
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={submitApplication.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitApplication.isPending ? 'Submitting...' : 'Submit Application'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SellerApplicationForm;
