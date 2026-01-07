import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Users, Store, Crown, CheckCircle, XCircle, Eye, Clock, 
  FileText, Calendar, MapPin, Mail, Phone, Building
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

const ApplicationsManagement = () => {
  const [sellerApplications, setSellerApplications] = useState<any[]>([]);
  const [ambassadorApplications, setAmbassadorApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [applicationType, setApplicationType] = useState<'seller' | 'ambassador'>('seller');
  const [adminNotes, setAdminNotes] = useState('');
  const [stats, setStats] = useState({
    pendingSeller: 0,
    pendingAmbassador: 0,
    approvedSeller: 0,
    approvedAmbassador: 0,
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // Fetch seller applications
      const { data: sellerData } = await supabase
        .from('seller_applications')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch ambassador applications
      const { data: ambassadorData } = await supabase
        .from('ambassador_applications')
        .select('*')
        .order('created_at', { ascending: false });

      setSellerApplications(sellerData || []);
      setAmbassadorApplications(ambassadorData || []);

      // Calculate stats
      setStats({
        pendingSeller: (sellerData || []).filter(a => a.status === 'pending').length,
        pendingAmbassador: (ambassadorData || []).filter(a => a.status === 'pending').length,
        approvedSeller: (sellerData || []).filter(a => a.status === 'approved').length,
        approvedAmbassador: (ambassadorData || []).filter(a => a.status === 'approved').length,
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleSellerApplication = async (applicationId: string, action: 'approved' | 'rejected') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update application status
      const { error: updateError } = await supabase
        .from('seller_applications')
        .update({
          status: action,
          admin_notes: adminNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // If approved, update the user's profile
      if (action === 'approved' && selectedApplication) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_seller: true,
            seller_verified: true,
            seller_application_approved: true,
            store_name: selectedApplication.store_name,
            store_description: selectedApplication.store_description,
            full_name: selectedApplication.full_name,
            phone: selectedApplication.phone,
            country: selectedApplication.country,
            city: selectedApplication.city,
            address: selectedApplication.address,
          })
          .eq('id', selectedApplication.user_id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      toast.success(`Application ${action}!`);
      setSelectedApplication(null);
      setAdminNotes('');
      fetchApplications();
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
    }
  };

  const handleAmbassadorApplication = async (applicationId: string, action: 'approved' | 'rejected') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const application = ambassadorApplications.find(a => a.id === applicationId);
      
      // Update application status
      const { error: updateError } = await supabase
        .from('ambassador_applications')
        .update({
          status: action,
          admin_notes: adminNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // If approved, create ambassador record and update profile
      if (action === 'approved' && application) {
        // Create ambassador record
        const ambassadorCode = `AMB${application.user_id.slice(0, 6).toUpperCase()}`;
        
        const { error: ambassadorError } = await supabase
          .from('ambassadors')
          .upsert({
            user_id: application.user_id,
            ambassador_code: ambassadorCode,
            social_handles: {
              instagram: application.instagram_handle,
              twitter: application.twitter_handle,
              tiktok: application.tiktok_handle,
              youtube: application.youtube_channel,
            },
            follower_count: application.total_followers,
            is_approved: true,
          });

        if (ambassadorError) {
          console.error('Error creating ambassador:', ambassadorError);
        }

        // Update profile with extracted data from ID
        if (application.id_scan_data) {
          const scanData = application.id_scan_data;
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: scanData.full_name || application.full_name,
              country: scanData.country || application.country,
            })
            .eq('id', application.user_id);

          if (profileError) {
            console.error('Error updating profile:', profileError);
          }
        }
      }

      toast.success(`Ambassador application ${action}!`);
      setSelectedApplication(null);
      setAdminNotes('');
      fetchApplications();
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-400/70 text-sm">Pending Sellers</p>
                <p className="text-2xl font-bold text-amber-300">{stats.pendingSeller}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400/70 text-sm">Approved Sellers</p>
                <p className="text-2xl font-bold text-green-300">{stats.approvedSeller}</p>
              </div>
              <Store className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400/70 text-sm">Pending Ambassadors</p>
                <p className="text-2xl font-bold text-purple-300">{stats.pendingAmbassador}</p>
              </div>
              <Crown className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400/70 text-sm">Approved Ambassadors</p>
                <p className="text-2xl font-bold text-blue-300">{stats.approvedAmbassador}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sellers" className="space-y-4">
        <TabsList className="bg-slate-800/50 border-amber-500/20">
          <TabsTrigger value="sellers" className="data-[state=active]:bg-amber-600 gap-2">
            <Store className="w-4 h-4" />
            Seller Applications ({sellerApplications.length})
          </TabsTrigger>
          <TabsTrigger value="ambassadors" className="data-[state=active]:bg-amber-600 gap-2">
            <Crown className="w-4 h-4" />
            Ambassador Applications ({ambassadorApplications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sellers">
          <Card className="bg-slate-800/50 border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-amber-300">Seller Applications</CardTitle>
              <CardDescription className="text-slate-400">
                Review and approve seller applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-500/20">
                    <TableHead className="text-amber-400">Applicant</TableHead>
                    <TableHead className="text-amber-400">Store Name</TableHead>
                    <TableHead className="text-amber-400">Business Type</TableHead>
                    <TableHead className="text-amber-400">Location</TableHead>
                    <TableHead className="text-amber-400">Applied</TableHead>
                    <TableHead className="text-amber-400">Status</TableHead>
                    <TableHead className="text-amber-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerApplications.map((app) => (
                    <TableRow key={app.id} className="border-amber-500/10">
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-200">{app.full_name}</p>
                          <p className="text-sm text-slate-400">{app.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{app.store_name}</TableCell>
                      <TableCell className="text-slate-300 capitalize">{app.business_type?.replace('_', ' ')}</TableCell>
                      <TableCell className="text-slate-300">{app.city}, {app.country}</TableCell>
                      <TableCell className="text-slate-300">
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-amber-500/30"
                              onClick={() => {
                                setSelectedApplication(app);
                                setApplicationType('seller');
                                setAdminNotes(app.admin_notes || '');
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 border-amber-500/30 max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-amber-300">Seller Application Details</DialogTitle>
                            </DialogHeader>
                            {selectedApplication && applicationType === 'seller' && (
                              <div className="space-y-6">
                                {/* Personal Info */}
                                <div>
                                  <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Personal Information
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-800 rounded-lg">
                                    <div>
                                      <p className="text-xs text-slate-400">Full Name</p>
                                      <p className="text-slate-200">{selectedApplication.full_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Email</p>
                                      <p className="text-slate-200">{selectedApplication.email}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Phone</p>
                                      <p className="text-slate-200">{selectedApplication.phone}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Gender</p>
                                      <p className="text-slate-200 capitalize">{selectedApplication.gender || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Date of Birth</p>
                                      <p className="text-slate-200">{selectedApplication.date_of_birth || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Address */}
                                <div>
                                  <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Address
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-800 rounded-lg">
                                    <div>
                                      <p className="text-xs text-slate-400">Country</p>
                                      <p className="text-slate-200">{selectedApplication.country}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">State</p>
                                      <p className="text-slate-200">{selectedApplication.state}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">City</p>
                                      <p className="text-slate-200">{selectedApplication.city}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-xs text-slate-400">Address</p>
                                      <p className="text-slate-200">{selectedApplication.address}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Postal Code</p>
                                      <p className="text-slate-200">{selectedApplication.postal_code || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Business Info */}
                                <div>
                                  <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                                    <Building className="w-4 h-4" /> Business Information
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800 rounded-lg">
                                    <div>
                                      <p className="text-xs text-slate-400">Store Name</p>
                                      <p className="text-slate-200">{selectedApplication.store_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Business Type</p>
                                      <p className="text-slate-200 capitalize">{selectedApplication.business_type?.replace('_', ' ')}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-xs text-slate-400">Store Description</p>
                                      <p className="text-slate-200">{selectedApplication.store_description}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Categories</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {selectedApplication.product_categories?.map((cat: string) => (
                                          <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Product Source</p>
                                      <p className="text-slate-200 capitalize">{selectedApplication.product_source?.replace('_', ' ') || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Payment Info */}
                                <div>
                                  <h4 className="text-sm font-medium text-amber-400 mb-2">Payment Information</h4>
                                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800 rounded-lg">
                                    <div>
                                      <p className="text-xs text-slate-400">Payout Method</p>
                                      <p className="text-slate-200 capitalize">{selectedApplication.preferred_payout_method?.replace('_', ' ')}</p>
                                    </div>
                                    {selectedApplication.bank_name && (
                                      <div>
                                        <p className="text-xs text-slate-400">Bank</p>
                                        <p className="text-slate-200">{selectedApplication.bank_name}</p>
                                      </div>
                                    )}
                                    {selectedApplication.paypal_email && (
                                      <div>
                                        <p className="text-xs text-slate-400">PayPal</p>
                                        <p className="text-slate-200">{selectedApplication.paypal_email}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Admin Notes */}
                                <div>
                                  <h4 className="text-sm font-medium text-amber-400 mb-2">Admin Notes</h4>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add notes about this application..."
                                    className="bg-slate-800 border-slate-700"
                                  />
                                </div>

                                {selectedApplication.status === 'pending' && (
                                  <DialogFooter className="gap-2">
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleSellerApplication(selectedApplication.id, 'rejected')}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </Button>
                                    <Button
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleSellerApplication(selectedApplication.id, 'approved')}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Approve
                                    </Button>
                                  </DialogFooter>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sellerApplications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                        No seller applications yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ambassadors">
          <Card className="bg-slate-800/50 border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-amber-300">Ambassador Applications</CardTitle>
              <CardDescription className="text-slate-400">
                Review ambassador applications with ID verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-500/20">
                    <TableHead className="text-amber-400">Applicant</TableHead>
                    <TableHead className="text-amber-400">Social Handles</TableHead>
                    <TableHead className="text-amber-400">Followers</TableHead>
                    <TableHead className="text-amber-400">ID Type</TableHead>
                    <TableHead className="text-amber-400">Applied</TableHead>
                    <TableHead className="text-amber-400">Status</TableHead>
                    <TableHead className="text-amber-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ambassadorApplications.map((app) => (
                    <TableRow key={app.id} className="border-amber-500/10">
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-200">{app.full_name || 'From ID'}</p>
                          <p className="text-sm text-slate-400">{app.country || 'Unknown'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex flex-wrap gap-1">
                          {app.instagram_handle && <Badge variant="outline" className="text-xs">IG</Badge>}
                          {app.twitter_handle && <Badge variant="outline" className="text-xs">X</Badge>}
                          {app.tiktok_handle && <Badge variant="outline" className="text-xs">TT</Badge>}
                          {app.youtube_channel && <Badge variant="outline" className="text-xs">YT</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {app.total_followers?.toLocaleString() || 'N/A'}
                      </TableCell>
                      <TableCell className="text-slate-300 capitalize">
                        {app.id_type?.replace('_', ' ') || 'N/A'}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-amber-500/30"
                              onClick={() => {
                                setSelectedApplication(app);
                                setApplicationType('ambassador');
                                setAdminNotes(app.admin_notes || '');
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 border-amber-500/30 max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-amber-300">Ambassador Application Details</DialogTitle>
                            </DialogHeader>
                            {selectedApplication && applicationType === 'ambassador' && (
                              <div className="space-y-6">
                                {/* ID Document */}
                                <div>
                                  <h4 className="text-sm font-medium text-amber-400 mb-2">ID Document</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedApplication.id_document_url && (
                                      <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden">
                                        <img 
                                          src={selectedApplication.id_document_url} 
                                          alt="ID Document"
                                          className="w-full h-full object-contain"
                                        />
                                      </div>
                                    )}
                                    <div className="p-4 bg-slate-800 rounded-lg">
                                      <p className="text-xs text-slate-400 mb-2">AI Extracted Data</p>
                                      {selectedApplication.id_scan_data ? (
                                        <div className="space-y-2">
                                          <p className="text-slate-200">
                                            <span className="text-slate-400">Name:</span> {selectedApplication.id_scan_data.full_name || 'N/A'}
                                          </p>
                                          <p className="text-slate-200">
                                            <span className="text-slate-400">DOB:</span> {selectedApplication.id_scan_data.date_of_birth || 'N/A'}
                                          </p>
                                          <p className="text-slate-200">
                                            <span className="text-slate-400">Gender:</span> {selectedApplication.id_scan_data.gender || 'N/A'}
                                          </p>
                                          <p className="text-slate-200">
                                            <span className="text-slate-400">Country:</span> {selectedApplication.id_scan_data.country || 'N/A'}
                                          </p>
                                          <p className="text-slate-200">
                                            <span className="text-slate-400">ID Type:</span> {selectedApplication.id_scan_data.id_type || 'N/A'}
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-slate-400">No AI scan data available</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Social Media */}
                                <div>
                                  <h4 className="text-sm font-medium text-amber-400 mb-2">Social Media</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-800 rounded-lg">
                                    <div>
                                      <p className="text-xs text-slate-400">Instagram</p>
                                      <p className="text-slate-200">{selectedApplication.instagram_handle || 'N/A'}</p>
                                      <p className="text-xs text-amber-400">{selectedApplication.instagram_followers?.toLocaleString()} followers</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Twitter/X</p>
                                      <p className="text-slate-200">{selectedApplication.twitter_handle || 'N/A'}</p>
                                      <p className="text-xs text-amber-400">{selectedApplication.twitter_followers?.toLocaleString()} followers</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">TikTok</p>
                                      <p className="text-slate-200">{selectedApplication.tiktok_handle || 'N/A'}</p>
                                      <p className="text-xs text-amber-400">{selectedApplication.tiktok_followers?.toLocaleString()} followers</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">YouTube</p>
                                      <p className="text-slate-200">{selectedApplication.youtube_channel || 'N/A'}</p>
                                      <p className="text-xs text-amber-400">{selectedApplication.youtube_subscribers?.toLocaleString()} subs</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Content Niche */}
                                <div>
                                  <h4 className="text-sm font-medium text-amber-400 mb-2">Content Niche</h4>
                                  <div className="flex flex-wrap gap-2 p-4 bg-slate-800 rounded-lg">
                                    {selectedApplication.content_niche?.map((niche: string) => (
                                      <Badge key={niche} variant="outline">{niche}</Badge>
                                    )) || <p className="text-slate-400">Not specified</p>}
                                  </div>
                                </div>

                                {/* Motivation */}
                                {selectedApplication.motivation && (
                                  <div>
                                    <h4 className="text-sm font-medium text-amber-400 mb-2">Motivation</h4>
                                    <p className="p-4 bg-slate-800 rounded-lg text-slate-200">
                                      {selectedApplication.motivation}
                                    </p>
                                  </div>
                                )}

                                {/* Admin Notes */}
                                <div>
                                  <h4 className="text-sm font-medium text-amber-400 mb-2">Admin Notes</h4>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add notes about this application..."
                                    className="bg-slate-800 border-slate-700"
                                  />
                                </div>

                                {selectedApplication.status === 'pending' && (
                                  <DialogFooter className="gap-2">
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleAmbassadorApplication(selectedApplication.id, 'rejected')}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </Button>
                                    <Button
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleAmbassadorApplication(selectedApplication.id, 'approved')}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Approve
                                    </Button>
                                  </DialogFooter>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ambassadorApplications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                        No ambassador applications yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApplicationsManagement;
