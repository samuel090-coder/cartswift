import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, User, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  created_at: string;
  images?: string[];
  is_verified: boolean;
}

interface ReviewsSectionProps {
  itemId: string;
}

const ReviewsSection = ({ itemId }: ReviewsSectionProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = sessionStorage.getItem('sessionId') || '';
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [showAllReviews, setShowAllReviews] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', itemId],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!reviewerName.trim() || !comment.trim()) {
        throw new Error('Name and comment are required');
      }

      await supabase
        .from('reviews')
        .insert({
          item_id: itemId,
          session_id: sessionId,
          rating,
          comment: comment.trim(),
          reviewer_name: reviewerName.trim(),
          reviewer_email: reviewerEmail.trim() || null
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', itemId] });
      setIsDialogOpen(false);
      setComment('');
      setReviewerName('');
      setReviewerEmail('');
      setRating(5);
      toast({
        title: '🎉 Review submitted!',
        description: '+10 loyalty points earned for your review!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review',
        variant: 'destructive',
      });
    }
  });

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const StarRating = ({ rating: currentRating, interactive = false, onRatingChange }: { 
    rating: number; 
    interactive?: boolean;
    onRatingChange?: (rating: number) => void;
  }) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={20}
          className={`${
            i < currentRating 
              ? 'fill-yellow-400 text-yellow-400' 
              : 'text-gray-300'
          } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={interactive && onRatingChange ? () => onRatingChange(i + 1) : undefined}
        />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customer Reviews</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={averageRating} />
              <span className="text-sm text-muted-foreground">
                ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-premium gap-2 text-white">
              <Star size={16} className="fill-white" />
              Write Review
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating rating={rating} interactive onRatingChange={setRating} />
              </div>
              
              <div>
                <Label htmlFor="reviewer-name">Your Name *</Label>
                <Input
                  id="reviewer-name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <Label htmlFor="reviewer-email">Email (optional)</Label>
                <Input
                  id="reviewer-email"
                  type="email"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <Label htmlFor="comment">Your Review *</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  rows={4}
                />
              </div>
              
              <Button 
                onClick={() => submitReview.mutate()} 
                disabled={submitReview.isPending}
                className="w-full"
              >
                {submitReview.isPending ? 'Submitting...' : 'Submit Review (+10 Points)'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="p-8 text-center">
              <div className="animate-bounce mb-4">
                <Star className="mx-auto text-primary/60" size={56} />
              </div>
              <h4 className="font-semibold text-lg mb-2">No reviews yet</h4>
              <p className="text-muted-foreground mb-4">Be the first to share your experience!</p>
              <div className="text-xs text-muted-foreground">
                ⭐ Earn 10 loyalty points for your review
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                {reviews.length.toLocaleString()} verified reviews
              </span>
              <span>•</span>
              <span>{Math.round(averageRating * 10) / 10} average rating</span>
            </div>
            {reviews.slice(0, showAllReviews ? reviews.length : 3).map((review) => (
              <Card key={review.id} className="review-card animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center ring-2 ring-primary/10">
                        <User size={18} className="text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{review.reviewer_name}</span>
                        {review.is_verified && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                            <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {reviews.length > 3 && (
              <div className="text-center pt-4">
                {!showAllReviews ? (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAllReviews(true)}
                    className="gap-2"
                  >
                    See all {reviews.length.toLocaleString()} reviews
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAllReviews(false)}
                    className="gap-2"
                  >
                    Show less
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewsSection;