import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { 
  Rocket, Eye, MapPin, Users, Clock, Sparkles, 
  Star, CheckCircle, XCircle, Loader2, DollarSign,
  TrendingUp, Edit, BarChart3
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';

const BoostRequestsManagement = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [viewCount, setViewCount] = useState('');
  const [rating, setRating] = useState([3]);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: boostRequests = [], isLoading } = useQuery({
    queryKey: ['admin-boost-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boost_requests')
        .select(`
          *,
          seller_products (
            title,
            images,
            price,
            seller_id
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch seller profiles for boost requests
  const { data: profiles = [] } = useQuery({
    queryKey: ['seller-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, store_name, full_name, email');
      if (error) throw error;
      return data;
    },
  });

  const getSellerName = (sellerId: string) => {
    const profile = profiles.find((p: any) => p.id === sellerId);
    return profile?.store_name || profile?.full_name || 'Unknown Seller';
  };

  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const now = new Date();
      const request = boostRequests.find((r: any) => r.id === requestId);
      const endsAt = new Date(now.getTime() + (request?.duration_days || 7) * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('boost_requests')
        .update({ 
          status: 'active',
          approved_at: now.toISOString(),
          starts_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', requestId);
      if (error) throw error;

      // Also feature the product
      await supabase
        .from('seller_products')
        .update({ 
          is_featured: true,
          featured_until: endsAt.toISOString(),
        })
        .eq('id', request?.product_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-boost-requests'] });
      toast.success('✅ Boost request approved! Product is now featured.');
      setSelectedRequest(null);
    },
    onError: () => toast.error('Failed to approve request'),
  });

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('boost_requests')
        .update({ 
          status: 'rejected',
          admin_notes: adminNotes || 'Rejected by admin',
        })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-boost-requests'] });
      toast.success('Boost request rejected');
      setSelectedRequest(null);
    },
    onError: () => toast.error('Failed to reject request'),
  });

  const updateStats = useMutation({
    mutationFn: async ({ requestId, views, adminRating, notes }: any) => {
      const { error } = await supabase
        .from('boost_requests')
        .update({ 
          actual_views: parseInt(views),
          admin_rating: adminRating,
          admin_notes: notes,
        })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-boost-requests'] });
      toast.success('📊 Stats updated successfully!');
      setEditMode(false);
      setSelectedRequest(null);
    },
    onError: () => toast.error('Failed to update stats'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white gap-1"><Rocket className="w-3 h-3" />Active</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500 text-white gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500 text-white gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    pending: boostRequests.filter((r: any) => r.status === 'pending').length,
    active: boostRequests.filter((r: any) => r.status === 'active').length,
    completed: boostRequests.filter((r: any) => r.status === 'completed').length,
    totalRevenue: boostRequests
      .filter((r: any) => r.status !== 'rejected')
      .reduce((sum: number, r: any) => sum + Number(r.amount_paid), 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-amber-950/30 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-amber-400/60">Pending</p>
                <p className="text-2xl font-bold text-amber-300">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-950/30 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Rocket className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-green-400/60">Active Boosts</p>
                <p className="text-2xl font-bold text-green-300">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-950/30 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-blue-400/60">Completed</p>
                <p className="text-2xl font-bold text-blue-300">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-950/30 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-purple-400/60">Revenue</p>
                <p className="text-2xl font-bold text-purple-300">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Boost Requests Table */}
      <Card className="bg-slate-900/50 border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-300">
            <Rocket className="w-5 h-5" />
            Boost Requests
          </CardTitle>
          <CardDescription className="text-slate-400">
            Manage product boost requests from sellers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {boostRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Rocket className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No boost requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Product</TableHead>
                    <TableHead className="text-slate-400">Seller</TableHead>
                    <TableHead className="text-slate-400">Package</TableHead>
                    <TableHead className="text-slate-400">Duration</TableHead>
                    <TableHead className="text-slate-400">Amount</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Views</TableHead>
                    <TableHead className="text-slate-400">Rating</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boostRequests.map((request: any) => (
                    <TableRow key={request.id} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {request.seller_products?.images?.[0] && (
                            <img 
                              src={request.seller_products.images[0]} 
                              alt="" 
                              className="w-10 h-10 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="font-medium text-white truncate max-w-[150px]">
                              {request.seller_products?.title || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-400">
                              ${request.seller_products?.price}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {getSellerName(request.seller_id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-300">
                          <Eye className="w-4 h-4 text-primary" />
                          {request.target_views?.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {request.duration_days} days
                      </TableCell>
                      <TableCell className="font-bold text-green-400">
                        ${Number(request.amount_paid).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {request.actual_views !== null ? (
                          <span className="text-blue-400">{request.actual_views?.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {request.admin_rating ? (
                          <div className="flex items-center gap-1">
                            {[...Array(request.admin_rating)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setEditMode(false);
                                }}
                                className="bg-green-600 hover:bg-green-700 h-8"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectRequest.mutate(request.id)}
                                className="h-8"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {(request.status === 'active' || request.status === 'completed') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setEditMode(true);
                                setViewCount(request.actual_views?.toString() || '');
                                setRating([request.admin_rating || 3]);
                                setAdminNotes(request.admin_notes || '');
                              }}
                              className="h-8 border-slate-600 text-slate-300"
                            >
                              <Edit className="w-4 h-4 mr-1" /> Stats
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve/Edit Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-300">
              {editMode ? (
                <><BarChart3 className="w-5 h-5" /> Edit Boost Stats</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Approve Boost Request</>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editMode ? 'Update views and rating for this boost' : 'Review and approve this boost request'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 mt-4">
              {/* Product Preview */}
              <Card className="bg-slate-800 border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {selectedRequest.seller_products?.images?.[0] && (
                      <img 
                        src={selectedRequest.seller_products.images[0]} 
                        alt="" 
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{selectedRequest.seller_products?.title}</p>
                      <p className="text-sm text-slate-400">
                        {selectedRequest.target_views?.toLocaleString()} views • {selectedRequest.duration_days} days
                      </p>
                      <p className="text-green-400 font-bold">
                        ${Number(selectedRequest.amount_paid).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {editMode && (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Actual Views</Label>
                    <Input
                      type="number"
                      value={viewCount}
                      onChange={(e) => setViewCount(e.target.value)}
                      placeholder="Enter actual view count"
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Rating (1-5 stars)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={rating}
                        onValueChange={setRating}
                        min={1}
                        max={5}
                        step={1}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        {[...Array(rating[0])].map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes..."
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                {editMode ? (
                  <Button
                    onClick={() => updateStats.mutate({
                      requestId: selectedRequest.id,
                      views: viewCount,
                      adminRating: rating[0],
                      notes: adminNotes,
                    })}
                    disabled={updateStats.isPending}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    {updateStats.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => approveRequest.mutate(selectedRequest.id)}
                    disabled={approveRequest.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {approveRequest.isPending ? 'Approving...' : '✅ Approve Boost'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoostRequestsManagement;
