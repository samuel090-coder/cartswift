import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { CheckCircle, Mail, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const DownloadConfirmation = () => {
  const navigate = useNavigate();

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
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Order Received!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-lg font-semibold text-gray-900">
                  We will confirm your order soon.
                </p>
                <p className="text-gray-600">
                  Check your email for the download link.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900">Check Your Inbox</p>
                    <p className="text-blue-700">
                      You'll receive your download link via email once payment is verified.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-900">Verification Time</p>
                    <p className="text-yellow-700">
                      Manual payments typically take 30 minutes to 2 hours to verify during business hours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  Continue Shopping
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = 'mailto:support@cartswift.com'}
                >
                  Contact Support
                </Button>
              </div>

              <div className="text-xs text-center text-gray-500 pt-4 border-t">
                <p>Having issues? Email us at support@cartswift.com</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DownloadConfirmation;
