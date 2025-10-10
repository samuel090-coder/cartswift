import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { toast } from '@/hooks/use-toast';
import { Mail, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const DownloadEmailSubmit = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const paymentReference = searchParams.get('payment');

  const getSessionId = () => {
    let sessionId = localStorage.getItem('cartswift-session');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cartswift-session', sessionId);
    }
    return sessionId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !itemId) {
      toast({
        title: "Error",
        description: "Please provide a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const sessionId = getSessionId();
      
      // Generate download token and create download record
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_download_token');
      
      if (tokenError) throw tokenError;
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
      
      const { error: downloadError } = await supabase
        .from('downloads')
        .insert({
          item_id: itemId,
          email: email,
          download_token: tokenData,
          session_id: sessionId,
          payment_verified: false,
          expires_at: expiresAt.toISOString(),
        });

      if (downloadError) throw downloadError;

      // Navigate to confirmation page
      navigate(`/download/${itemId}/confirmation`);
    } catch (error) {
      console.error('Error submitting email:', error);
      toast({
        title: "Submission failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto"
        >
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Download className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Almost There!</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center text-gray-600 mb-6">
                  <p>
                    Input your email address so we can send you a direct link to download your {itemId?.includes('apk') ? 'APK' : 'file'}.
                  </p>
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    We'll send your download link to this email address
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Email'}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => navigate('/')}
                  >
                    Return to Home
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DownloadEmailSubmit;
