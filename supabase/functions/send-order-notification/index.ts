import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  orderId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  paymentMethod: string;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId, customerName, customerEmail, totalAmount, paymentMethod, items }: OrderNotificationRequest = await req.json();

    console.log('Processing order notification for order:', orderId);

    // Get all admin users with their emails
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select(`
        user_id,
        is_admin
      `)
      .eq('is_admin', true);

    if (adminError) {
      console.error('Error fetching admin users:', adminError);
      throw adminError;
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found');
      return new Response(JSON.stringify({ message: 'No admin users to notify' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get admin emails from auth.users (this requires service role key)
    const adminUserIds = adminUsers.map(admin => admin.user_id);
    
    // For now, we'll use a default admin email since we can't easily access auth.users
    // In production, you might want to store admin emails in a separate table
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@cartswift.com';

    const itemsList = items.map(item => 
      `• ${item.title} (Qty: ${item.quantity}) - $${item.price.toFixed(2)}`
    ).join('\n');

    const emailResponse = await resend.emails.send({
      from: "CartSwift <notifications@cartswift.com>",
      to: [adminEmail],
      subject: `New Order #${orderId} - $${totalAmount.toFixed(2)}`,
      html: `
        <h2>🛒 New Order Received!</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Order Details</h3>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
          <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Order Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <h3>Items Ordered:</h3>
        <div style="background: #ffffff; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <pre style="margin: 0; font-family: Arial, sans-serif;">${itemsList}</pre>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
          <p style="margin: 0;"><strong>💡 Action Required:</strong> Please check your admin dashboard to process this order.</p>
        </div>
        
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          This is an automated notification from CartSwift Admin System.
        </p>
      `,
    });

    console.log("Admin notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: 'Admin notification sent',
      emailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-order-notification function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);