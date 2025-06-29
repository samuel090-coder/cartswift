
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const AdminStatusChecker = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        setStatus({ error: `User fetch error: ${userError.message}` });
        return;
      }

      if (!user) {
        setStatus({ error: 'No authenticated user found' });
        return;
      }

      // Check admin status
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setStatus({
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        adminRecord: adminData,
        adminError: adminError?.message,
        isAdmin: adminData?.is_admin || false
      });

    } catch (error: any) {
      setStatus({ error: `Unexpected error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const createAdminRecord = async () => {
    if (!status?.user?.id) return;
    
    try {
      const { error } = await supabase
        .from('admin_users')
        .insert({ user_id: status.user.id, is_admin: true });
      
      if (error) {
        alert(`Error creating admin record: ${error.message}`);
      } else {
        alert('Admin record created! Please refresh to see changes.');
        checkAdminStatus();
      }
    } catch (error: any) {
      alert(`Unexpected error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Status Checker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkAdminStatus} variant="outline">
              Refresh Status
            </Button>
            
            <div className="bg-gray-100 p-4 rounded font-mono text-sm">
              <pre>{JSON.stringify(status, null, 2)}</pre>
            </div>

            {status?.user && !status?.adminRecord && (
              <div className="space-y-2">
                <p className="text-orange-600">No admin record found for this user.</p>
                <Button onClick={createAdminRecord} variant="default">
                  Create Admin Record (with admin privileges)
                </Button>
              </div>
            )}
            
            {status?.adminRecord && !status?.isAdmin && (
              <div className="text-red-600">
                <p>Admin record exists but is_admin is set to false.</p>
                <p>You need to manually set is_admin = true in your Supabase database.</p>
              </div>
            )}
            
            {status?.isAdmin && (
              <div className="text-green-600">
                <p>✅ You have admin privileges!</p>
                <a href="/admin/dashboard" className="text-blue-600 underline">
                  Go to Admin Dashboard
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminStatusChecker;
