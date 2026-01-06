import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Crown, Lock, Mail } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Check if user is already logged in and is an allowed admin
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
          // Check if email is in allowed_admins table
          const { data: allowedAdmin } = await supabase
            .from('allowed_admins')
            .select('email')
            .eq('email', user.email)
            .single();

          if (allowedAdmin) {
            navigate('/admin/dashboard');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Check if user email is in allowed_admins table
      const { data: allowedAdmin, error: adminError } = await supabase
        .from('allowed_admins')
        .select('email')
        .eq('email', data.user.email)
        .single();

      if (adminError || !allowedAdmin) {
        toast({
          title: "Access denied",
          description: "Your email is not authorized for admin access.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }

      // Also ensure they have an admin_users record
      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', data.user.id)
        .single();

      if (!existingAdmin) {
        await supabase
          .from('admin_users')
          .insert({ user_id: data.user.id, is_admin: true });
      } else {
        await supabase
          .from('admin_users')
          .update({ is_admin: true })
          .eq('user_id', data.user.id);
      }

      toast({
        title: "Welcome back, Admin!",
        description: "Successfully logged in to admin panel.",
      });
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <div className="text-amber-300">Checking authentication...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-amber-500/30 bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
            CARTSWIFT Admin
          </CardTitle>
          <p className="text-amber-400/60 text-sm">Restricted Access - Authorized Personnel Only</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-amber-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                  className="pl-10 bg-slate-800/50 border-amber-500/30 text-amber-100 placeholder:text-amber-400/40"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-amber-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="pl-10 bg-slate-800/50 border-amber-500/30 text-amber-100 placeholder:text-amber-400/40"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white" 
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In to Admin Panel'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-amber-400/50">
              Access is restricted to authorized email addresses only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;