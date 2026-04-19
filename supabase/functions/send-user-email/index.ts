// Brevo (Sendinblue) transactional email sender for CartSwift.
// Used for: order received, payment approved/declined, order live, social events.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const FROM_EMAIL = 'no-reply@cartswift.com';
const FROM_NAME = 'CartSwift';
const OFFICE = 'Miami, Florida, USA';

interface EmailReq {
  to: string;
  subject?: string;
  template: string;
  data?: Record<string, any>;
}

const wrap = (title: string, inner: string) => `
<!DOCTYPE html><html><body style="margin:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.06)">
      <div style="background:linear-gradient(135deg,#ec4899,#8b5cf6);padding:20px 24px">
        <h1 style="margin:0;color:#fff;font-size:20px">CartSwift</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:12px">${OFFICE}</p>
      </div>
      <div style="padding:24px">
        <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
        ${inner}
      </div>
      <div style="padding:14px 24px;background:#fafafa;color:#64748b;font-size:11px;text-align:center">
        © CartSwift · ${OFFICE}
      </div>
    </div>
  </div>
</body></html>`;

const buildHtml = (template: string, d: Record<string, any> = {}): { subject: string; html: string } => {
  switch (template) {
    case 'order_received': {
      const ship = d.shipping || {};
      const items = (d.items || []).map((i: any) => `<li>${i.title} × ${i.quantity || 1} — $${(i.price || 0).toFixed(2)}</li>`).join('') || `<li>${d.productTitle || ''} — $${(d.total || 0).toFixed(2)}</li>`;
      return {
        subject: `Order received — tracking ${d.trackingCode || ''}`,
        html: wrap('We received your order 🎉', `
          <p>Thanks for shopping with CartSwift! Your order has been received and is awaiting payment confirmation.</p>
          <div style="background:#f8fafc;border-radius:10px;padding:14px;margin:14px 0">
            <p style="margin:0"><strong>Tracking code:</strong> <span style="font-family:monospace;font-size:16px;color:#ec4899">${d.trackingCode || '—'}</span></p>
            <p style="margin:6px 0 0"><strong>Total:</strong> ${d.currency || '$'} ${(d.total || 0).toFixed(2)}</p>
          </div>
          <p><strong>Items:</strong></p>
          <ul style="padding-left:18px">${items}</ul>
          <p><strong>Ship to:</strong><br>${ship.fullName || ''}<br>${ship.address || ''}<br>${[ship.city, ship.state, ship.country].filter(Boolean).join(', ')}</p>
          <p style="margin-top:18px"><a href="https://cartswift.lovable.app/track?code=${d.trackingCode || ''}" style="background:#ec4899;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Track your order</a></p>
        `),
      };
    }
    case 'payment_approved':
      return {
        subject: 'Your payment was approved ✅',
        html: wrap('Payment approved', `
          <p>Good news — we've confirmed your payment for order <strong>${d.trackingCode || d.orderId}</strong>.</p>
          <p>Your order is now being prepared for shipment from our Miami warehouse.</p>
          <p style="margin-top:16px"><a href="https://cartswift.lovable.app/track?code=${d.trackingCode || ''}" style="background:#10b981;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">View live tracking</a></p>
        `),
      };
    case 'payment_declined':
      return {
        subject: 'Issue with your payment',
        html: wrap('Payment could not be approved', `
          <p>Unfortunately we couldn't confirm your payment for order <strong>${d.trackingCode || d.orderId}</strong>.</p>
          <p><strong>Reason:</strong> ${d.reason || 'Please re-upload a clearer payment proof.'}</p>
          <p>You can resubmit proof of payment from your Orders page.</p>
        `),
      };
    case 'order_live': {
      const dest = d.destination || '';
      const mapImg = d.lat && d.lon
        ? `https://staticmap.openstreetmap.de/staticmap.php?center=${d.lat},${d.lon}&zoom=4&size=560x260&maptype=mapnik&markers=25.7617,-80.1918,red|${d.lat},${d.lon},blue`
        : null;
      return {
        subject: `Your order is live — tracking ${d.trackingCode || ''}`,
        html: wrap('Your order is on the move 🚚', `
          <p>Your order has shipped from our <strong>Miami, FL</strong> warehouse and is heading to <strong>${dest}</strong>.</p>
          <div style="background:#f8fafc;border-radius:10px;padding:14px;margin:14px 0">
            <p style="margin:0"><strong>Tracking:</strong> <span style="font-family:monospace;color:#ec4899">${d.trackingCode || ''}</span></p>
            <p style="margin:6px 0 0"><strong>ETA:</strong> ${d.eta || '—'}</p>
            <p style="margin:6px 0 0"><strong>Distance from Miami:</strong> ${d.distanceKm ? d.distanceKm + ' km' : '—'}</p>
          </div>
          ${mapImg ? `<img src="${mapImg}" alt="route" style="width:100%;border-radius:10px;border:1px solid #e2e8f0"/>` : ''}
          <p style="margin-top:16px"><a href="https://cartswift.lovable.app/track?code=${d.trackingCode || ''}" style="background:#ec4899;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open live map</a></p>
        `),
      };
    }
    case 'new_follower':
      return {
        subject: `${d.actorName || 'Someone'} started following you`,
        html: wrap('You have a new follower 👤', `<p><strong>${d.actorName || 'Someone'}</strong> just followed you on CartSwift.</p><p><a href="https://cartswift.lovable.app/profile/${d.actorId}">View their profile →</a></p>`),
      };
    case 'unfollow':
      return {
        subject: `${d.actorName || 'Someone'} unfollowed you`,
        html: wrap('Follower update', `<p><strong>${d.actorName || 'Someone'}</strong> unfollowed you. Keep posting great content!</p>`),
      };
    case 'status_like':
      return {
        subject: `${d.actorName || 'Someone'} reacted to your status ${d.reaction || '❤️'}`,
        html: wrap('New status reaction', `<p><strong>${d.actorName || 'Someone'}</strong> reacted with ${d.reaction || '❤️'} to your status.</p>`),
      };
    case 'status_purchase':
      return {
        subject: `💰 You earned a sale from your status!`,
        html: wrap('A buyer purchased from your status', `
          <p><strong>${d.buyerName || 'A buyer'}</strong> purchased <strong>${d.productTitle}</strong> from your status post.</p>
          <p><strong>Sale:</strong> ${d.currency || '$'} ${(d.amount || 0).toFixed(2)}<br>
          <strong>Your commission:</strong> ${d.currency || '$'} ${(d.commission || 0).toFixed(2)}</p>
        `),
      };
    default:
      return { subject: d.subject || 'CartSwift notification', html: wrap(d.subject || 'CartSwift', `<p>${d.message || ''}</p>`) };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY is not configured');
    const body: EmailReq = await req.json();
    if (!body.to || !body.template) throw new Error('Missing to/template');

    const { subject, html } = buildHtml(body.template, body.data || {});
    const finalSubject = body.subject || subject;

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: body.to }],
        subject: finalSubject,
        htmlContent: html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${JSON.stringify(data)}`);

    return new Response(JSON.stringify({ success: true, messageId: data?.messageId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-user-email error', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
