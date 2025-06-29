
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Check if user is already logged in and is admin
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        addDebugInfo('Checking existing authentication...');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          addDebugInfo(`User found: ${user.email}`);
          
          // Check admin status
          const { data: adminUser, error } = await supabase
            .from('admin_users')
            .select('is_admin')
            .eq('user_id', user.id)
            .single();

          addDebugInfo(`Admin check - Data: ${JSON.stringify(adminUser)}, Error: ${error?.message || 'None'}`);

          if (adminUser?.is_admin) {
            addDebugInfo('User is admin, redirecting to dashboard');
            navigate('/admin/dashboard');
          } else {
            addDebugInfo('User is not admin or admin record not found');
          }
        } else {
          addDebugInfo('No authenticated user found');
        }
      } catch (error) {
        addDebugInfo(`Auth check error: ${error}`);
      }
    };

    checkExistingAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDebugInfo([]); // Clear previous debug info

    try {
      addDebugInfo(`Starting login for: ${formData.email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        addDebugInfo(`Login error: ${error.message}`);
        throw error;
      }

      addDebugInfo(`Login successful for user ID: ${data.user.id}`);

      // Wait a moment for session to establish
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if user is admin
      addDebugInfo('Checking admin status...');
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('is_admin, user_id')
        .eq('user_id', data.user.id)
        .single();

      addDebugInfo(`Admin query result: ${JSON.stringify({ adminUser, adminError: adminError?.message })}`);

      if (adminError) {
        if (adminError.code === 'PGRST116') {
          addDebugInfo('No admin record found, creating one...');
          // Create admin record
          const { error: insertError } = await supabase
            .from('admin_users')
            .insert({ user_id: data.user.id, is_admin: false });
          
          if (insertError) {
            addDebugInfo(`Failed to create admin record: ${insertError.message}`);
          } else {
            addDebugInfo('Admin record created with is_admin=false');
          }
        }
        
        toast({
          title: "Access denied",
          description: "You don't have admin privileges. Please contact an administrator.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }

      if (!adminUser?.is_admin) {
        addDebugInfo(`User is not admin. Admin status: ${adminUser?.is_admin}`);
        toast({
          title: "Access denied",
          description: "You don't have admin privileges. Please contact an administrator.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }

      addDebugInfo('Admin access granted, redirecting...');
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to admin panel.",
      });
      navigate('/admin/dashboard');
    } catch (error: any) {
      addDebugInfo(`Login process error: ${error.message}`);
      toast({
        title: "Login failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`
        }
      });

      if (error) throw error;

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account. Note: Admin privileges need to be granted separately.",
      });
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">CARTSWIFT Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="samuelsunday09066423764@gmail.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Debug Information Panel */}
        {debugInfo.length > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {debugInfo.map((info, index) => (
                  <div key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                    {info}
                  </div>
                ))}
              </div>
              <Button 
                onClick={() => setDebugInfo([])} 
                variant="outline" 
                size="sm" 
                className="mt-4"
              >
                Clear Debug Info
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
