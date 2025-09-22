import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Star, Plus, Edit, Trash2, User, Sparkles } from 'lucide-react';

const ReviewsManagement = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [generateCount, setGenerateCount] = useState('10');
  const [selectedItemId, setSelectedItemId] = useState('');
  const queryClient = useQueryClient();

  const [reviewForm, setReviewForm] = useState({
    item_id: '',
    rating: 5,
    comment: '',
    reviewer_name: '',
    reviewer_email: '',
    is_verified: false
  });

  // Fetch reviews
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          items:items(title, images)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Fetch items for dropdowns
  const { data: items = [] } = useQuery({
    queryKey: ['admin-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    }
  });

  // Create review mutation
  const createReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('reviews')
        .insert({
          item_id: reviewForm.item_id,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          reviewer_name: reviewForm.reviewer_name,
          reviewer_email: reviewForm.reviewer_email || null,
          is_verified: reviewForm.is_verified,
          session_id: 'admin_session_' + Date.now()
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('Review created successfully!');
    },
    onError: () => {
      toast.error('Failed to create review');
    }
  });

  // Update review mutation
  const updateReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('reviews')
        .update({
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          reviewer_name: reviewForm.reviewer_name,
          reviewer_email: reviewForm.reviewer_email || null,
          is_verified: reviewForm.is_verified
        })
        .eq('id', editingReview.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setIsEditDialogOpen(false);
      setEditingReview(null);
      resetForm();
      toast.success('Review updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update review');
    }
  });

  // Delete review mutation
  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete review');
    }
  });

  // Generate reviews mutation
  const generateReviews = useMutation({
    mutationFn: async () => {
      const count = parseInt(generateCount);
      const itemId = selectedItemId;
      
      const comments = [
        'Amazing quality! Exceeded all my expectations.',
        'Great product and fast shipping. Highly recommend!',
        'Perfect! Exactly what I was looking for.',
        'Outstanding quality for the price. Very satisfied.',
        'Incredible product! Will definitely buy again.',
        'Excellent purchase. Great value for money.',
        'Love it! Perfect quality and quick delivery.',
        'Fantastic quality and attention to detail.',
        'Perfect fit and amazing comfort.',
        'Best purchase I have made this year!'
      ];

      const names = [
        'Alex Johnson', 'Sam Wilson', 'Jordan Smith', 'Casey Brown', 'Taylor Davis',
        'Morgan Lee', 'Riley Chen', 'Avery Johnson', 'Quinn Taylor', 'Sage Wilson'
      ];

      const reviewsToInsert = [];
      for (let i = 0; i < count; i++) {
        reviewsToInsert.push({
          item_id: itemId,
          rating: Math.random() < 0.8 ? 5 : 4,
          comment: comments[Math.floor(Math.random() * comments.length)],
          reviewer_name: names[Math.floor(Math.random() * names.length)],
          reviewer_email: Math.random() > 0.6 ? `customer${Math.floor(Math.random() * 1000)}@email.com` : null,
          is_verified: Math.random() > 0.3,
          session_id: 'admin_generated_' + Date.now() + '_' + i,
          created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      const { error } = await supabase
        .from('reviews')
        .insert(reviewsToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setIsGenerateDialogOpen(false);
      setGenerateCount('10');
      setSelectedItemId('');
      toast.success(`Generated ${generateCount} reviews successfully!`);
    },
    onError: () => {
      toast.error('Failed to generate reviews');
    }
  });

  const resetForm = () => {
    setReviewForm({
      item_id: '',
      rating: 5,
      comment: '',
      reviewer_name: '',
      reviewer_email: '',
      is_verified: false
    });
  };

  const handleEdit = (review: any) => {
    setEditingReview(review);
    setReviewForm({
      item_id: review.item_id,
      rating: review.rating,
      comment: review.comment,
      reviewer_name: review.reviewer_name,
      reviewer_email: review.reviewer_email || '',
      is_verified: review.is_verified
    });
    setIsEditDialogOpen(true);
  };

  const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={20}
          className={`cursor-pointer hover:scale-110 transition-transform ${
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
          onClick={() => onRatingChange(i + 1)}
        />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reviews Management</h2>
        <div className="flex gap-2">
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sparkles size={16} />
                Generate Reviews
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Reviews</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Product</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                  >
                    <option value="">Select a product</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Number of Reviews</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={generateCount}
                    onChange={(e) => setGenerateCount(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => generateReviews.mutate()}
                  disabled={generateReviews.isPending || !selectedItemId}
                  className="w-full"
                >
                  {generateReviews.isPending ? 'Generating...' : `Generate ${generateCount} Reviews`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={16} />
                Add Review
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Review</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Product</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={reviewForm.item_id}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, item_id: e.target.value }))}
                  >
                    <option value="">Select a product</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Rating</Label>
                  <StarRating 
                    rating={reviewForm.rating} 
                    onRatingChange={(rating) => setReviewForm(prev => ({ ...prev, rating }))} 
                  />
                </div>
                
                <div>
                  <Label>Reviewer Name</Label>
                  <Input
                    value={reviewForm.reviewer_name}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, reviewer_name: e.target.value }))}
                    placeholder="Enter reviewer name"
                  />
                </div>
                
                <div>
                  <Label>Email (optional)</Label>
                  <Input
                    type="email"
                    value={reviewForm.reviewer_email}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, reviewer_email: e.target.value }))}
                    placeholder="reviewer@email.com"
                  />
                </div>
                
                <div>
                  <Label>Review Comment</Label>
                  <Textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Enter review comment..."
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="verified"
                    checked={reviewForm.is_verified}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, is_verified: e.target.checked }))}
                  />
                  <Label htmlFor="verified">Verified Review</Label>
                </div>
                
                <Button 
                  onClick={() => createReview.mutate()}
                  disabled={createReview.isPending}
                  className="w-full"
                >
                  {createReview.isPending ? 'Creating...' : 'Create Review'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{review.reviewer_name}</span>
                      {review.is_verified && (
                        <Badge variant="secondary" className="text-xs">
                          Verified
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Product: {review.items?.title}
                    </p>
                    <p className="text-sm">{review.comment}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(review)}
                  >
                    <Edit size={14} />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 size={14} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Review</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this review? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteReview.mutate(review.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <StarRating 
                rating={reviewForm.rating} 
                onRatingChange={(rating) => setReviewForm(prev => ({ ...prev, rating }))} 
              />
            </div>
            
            <div>
              <Label>Reviewer Name</Label>
              <Input
                value={reviewForm.reviewer_name}
                onChange={(e) => setReviewForm(prev => ({ ...prev, reviewer_name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label>Email (optional)</Label>
              <Input
                type="email"
                value={reviewForm.reviewer_email}
                onChange={(e) => setReviewForm(prev => ({ ...prev, reviewer_email: e.target.value }))}
              />
            </div>
            
            <div>
              <Label>Review Comment</Label>
              <Textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-verified"
                checked={reviewForm.is_verified}
                onChange={(e) => setReviewForm(prev => ({ ...prev, is_verified: e.target.checked }))}
              />
              <Label htmlFor="edit-verified">Verified Review</Label>
            </div>
            
            <Button 
              onClick={() => updateReview.mutate()}
              disabled={updateReview.isPending}
              className="w-full"
            >
              {updateReview.isPending ? 'Updating...' : 'Update Review'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewsManagement;