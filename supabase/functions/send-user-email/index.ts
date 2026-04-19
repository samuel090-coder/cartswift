// Brevo (Sendinblue) transactional email sender for CartSwift.
// Branded, image-style HTML templates matching the CartSwift look & feel.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const FROM_EMAIL = 'no-reply@cartswift.com';
const FROM_NAME = 'CartSwift';
const OFFICE = 'Miami, Florida, USA';
const SITE = 'https://cartswift.lovable.app';
const LOGO = 'https://cartswift.lovable.app/icon-192.png';

interface EmailReq {
  to: string;
  subject?: string;
  template: string;
  data?: Record<string, any>;
}

// Branded shell — image-like hero, gradient header, logo, footer
const shell = (opts: {
  preheader?: string;
  heroEmoji?: string;
  heroTitle: string;
  heroSubtitle?: string;
  heroGradient?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) => {
  const gradient = opts.heroGradient || 'linear-gradient(135deg,#ec4899 0%,#8b5cf6 50%,#6366f1 100%)';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CartSwift</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${opts.preheader}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(15,23,42,.08)">
      <!-- Brand bar -->
      <tr><td style="background:#ffffff;padding:18px 28px;border-bottom:1px solid #f1f5f9">
        <table width="100%"><tr>
          <td align="left">
            <img src="${LOGO}" alt="CartSwift" width="36" height="36" style="border-radius:10px;vertical-align:middle">
            <span style="font-size:18px;font-weight:800;color:#0f172a;margin-left:10px;vertical-align:middle;letter-spacing:-.3px">CartSwift</span>
          </td>
          <td align="right" style="font-size:11px;color:#64748b;font-weight:600">${OFFICE}</td>
        </tr></table>
      </td></tr>
      <!-- Hero -->
      <tr><td style="background:${gradient};padding:42px 28px;text-align:center">
        ${opts.heroEmoji ? `<div style="font-size:56px;line-height:1;margin-bottom:14px">${opts.heroEmoji}</div>` : ''}
        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-.5px">${opts.heroTitle}</h1>
        ${opts.heroSubtitle ? `<p style="margin:10px 0 0;color:rgba(255,255,255,.92);font-size:15px;line-height:1.5">${opts.heroSubtitle}</p>` : ''}
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:30px 28px 8px;font-size:15px;line-height:1.65;color:#334155">
        ${opts.body}
        ${opts.ctaLabel && opts.ctaUrl ? `
        <div style="text-align:center;margin:28px 0 8px">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;box-shadow:0 4px 14px rgba(236,72,153,.35)">${opts.ctaLabel}</a>
        </div>` : ''}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:24px 28px 28px;border-top:1px solid #f1f5f9;background:#fafbfc;text-align:center">
        <img src="${LOGO}" alt="" width="24" height="24" style="border-radius:6px;opacity:.7">
        <p style="margin:8px 0 4px;font-size:12px;color:#64748b;font-weight:600">CartSwift · ${OFFICE}</p>
        <p style="margin:0;font-size:11px;color:#94a3b8">
          <a href="${SITE}" style="color:#94a3b8;text-decoration:none">cartswift.lovable.app</a> ·
          You're receiving this because you have an account or order with CartSwift.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
};

const infoBox = (rows: Array<[string, string]>) => `
<table width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:18px 0">
${rows.map(([k, v]) => `<tr>
  <td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%">${k}</td>
  <td style="padding:10px 16px;font-size:14px;color:#0f172a;font-weight:700;text-align:right">${v}</td>
</tr>`).join('')}
</table>`;

const buildHtml = (template: string, d: Record<string, any> = {}): { subject: string; html: string } => {
  const cur = d.currency || '$';
  const fmt = (n: any) => `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const trackUrl = `${SITE}/track?code=${d.trackingCode || ''}`;

  switch (template) {
    case 'order_received': {
      const ship = d.shipping || {};
      const items = (d.items || []).map((i: any) =>
        `<tr><td style="padding:8px 0;font-size:14px;color:#334155">${i.title} <span style="color:#94a3b8">× ${i.quantity || 1}</span></td><td style="padding:8px 0;text-align:right;font-weight:700;color:#0f172a">${fmt(i.price)}</td></tr>`
      ).join('') || `<tr><td style="padding:8px 0">${d.productTitle || 'Item'}</td><td style="text-align:right;font-weight:700">${fmt(d.total)}</td></tr>`;
      return {
        subject: `Order received — ${d.trackingCode || ''}`,
        html: shell({
          preheader: `Your CartSwift order ${d.trackingCode || ''} is awaiting payment confirmation.`,
          heroEmoji: '🎉',
          heroTitle: 'We received your order!',
          heroSubtitle: `Tracking code <strong style="font-family:monospace;background:rgba(255,255,255,.18);padding:3px 10px;border-radius:6px">${d.trackingCode || '—'}</strong>`,
          body: `
            <p style="margin:0 0 6px">Thanks for shopping with <strong>CartSwift</strong>! Your order has been received and we're awaiting payment confirmation.</p>
            ${infoBox([
              ['Tracking code', `<span style="font-family:monospace;color:#ec4899">${d.trackingCode || '—'}</span>`],
              ['Order total', fmt(d.total)],
              ['Shipping to', `${ship.fullName || ''}`],
            ])}
            <h3 style="margin:18px 0 6px;font-size:14px;color:#0f172a;text-transform:uppercase;letter-spacing:.5px">Items</h3>
            <table width="100%" style="border-top:1px solid #f1f5f9">${items}</table>
            <h3 style="margin:22px 0 6px;font-size:14px;color:#0f172a;text-transform:uppercase;letter-spacing:.5px">Shipping address</h3>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.6">
              ${ship.fullName || ''}<br>
              ${ship.address || ''}<br>
              ${[ship.city, ship.state, ship.country].filter(Boolean).join(', ')}
            </p>
          `,
          ctaLabel: 'Track Your Order',
          ctaUrl: trackUrl,
        }),
      };
    }
    case 'payment_approved':
      return {
        subject: 'Payment approved — your order is being prepared',
        html: shell({
          preheader: `Payment confirmed for order ${d.trackingCode || d.orderId}`,
          heroEmoji: '✅',
          heroTitle: 'Payment Approved',
          heroSubtitle: `Order <strong>${d.trackingCode || d.orderId}</strong>`,
          heroGradient: 'linear-gradient(135deg,#10b981 0%,#059669 60%,#047857 100%)',
          body: `
            <p>Great news — we've confirmed your payment and your order is now being prepared for shipment from our <strong>Miami, FL</strong> warehouse.</p>
            ${infoBox([['Tracking code', d.trackingCode || '—'], ['Status', 'Preparing for shipment']])}
            <p style="color:#64748b;font-size:13px">You'll receive another email the moment your package leaves our warehouse with live map tracking.</p>
          `,
          ctaLabel: 'View Live Tracking',
          ctaUrl: trackUrl,
        }),
      };
    case 'payment_declined':
      return {
        subject: 'Issue with your payment',
        html: shell({
          preheader: 'We couldn\'t verify your payment proof.',
          heroEmoji: '⚠️',
          heroTitle: 'Payment Could Not Be Approved',
          heroGradient: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)',
          body: `
            <p>Unfortunately we couldn't confirm your payment for order <strong>${d.trackingCode || d.orderId}</strong>.</p>
            ${infoBox([['Reason', d.reason || 'Please re-upload a clearer payment proof.']])}
            <p>You can resubmit proof of payment from your <a href="${SITE}/orders" style="color:#ec4899;font-weight:600">Orders page</a>.</p>
          `,
          ctaLabel: 'Resubmit Payment Proof',
          ctaUrl: `${SITE}/orders`,
        }),
      };
    case 'order_live': {
      const dest = d.destination || '';
      const mapImg = d.lat && d.lon
        ? `https://staticmap.openstreetmap.de/staticmap.php?center=${d.lat},${d.lon}&zoom=4&size=560x280&maptype=mapnik&markers=25.7617,-80.1918,red|${d.lat},${d.lon},blue`
        : null;
      return {
        subject: `Your order is on the move — ${d.trackingCode || ''}`,
        html: shell({
          preheader: `Shipped from Miami, FL → ${dest}`,
          heroEmoji: '🚚',
          heroTitle: 'Your order is live!',
          heroSubtitle: `From <strong>Miami, FL</strong> → <strong>${dest}</strong>`,
          body: `
            <p>Your order has shipped from our <strong>Miami, Florida</strong> warehouse and is on its way to you.</p>
            ${infoBox([
              ['Tracking', `<span style="font-family:monospace;color:#ec4899">${d.trackingCode || ''}</span>`],
              ['Destination', dest],
              ['Distance from Miami', d.distanceKm ? `${Number(d.distanceKm).toLocaleString()} km` : '—'],
              ['Estimated arrival', d.eta || '—'],
              ['Current status', (d.status || 'In transit').replace(/_/g, ' ')],
            ])}
            ${mapImg ? `<div style="margin:18px 0;text-align:center">
              <img src="${mapImg}" alt="Shipping route from Miami to ${dest}" style="width:100%;max-width:560px;border-radius:12px;border:1px solid #e2e8f0;display:block;margin:0 auto"/>
              <p style="margin:8px 0 0;font-size:11px;color:#94a3b8">🔴 Miami HQ · 🔵 Destination</p>
            </div>` : ''}
            ${d.description ? `<p style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px 14px;border-radius:6px;font-size:14px;color:#78350f;margin:18px 0"><strong>Latest update:</strong> ${d.description}</p>` : ''}
          `,
          ctaLabel: 'Open Live Map',
          ctaUrl: trackUrl,
        }),
      };
    }
    case 'new_follower':
      return {
        subject: `${d.actorName || 'Someone'} started following you`,
        html: shell({
          preheader: `${d.actorName || 'Someone'} just followed your CartSwift profile.`,
          heroEmoji: '👤',
          heroTitle: 'You have a new follower!',
          heroGradient: 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)',
          body: `<p style="text-align:center;font-size:16px"><strong style="color:#0f172a">${d.actorName || 'Someone'}</strong> just started following you on CartSwift.</p>
                 <p style="text-align:center;color:#64748b">Keep posting great content — your audience is growing!</p>`,
          ctaLabel: 'View Their Profile',
          ctaUrl: `${SITE}/profile/${d.actorId || ''}`,
        }),
      };
    case 'unfollow':
      return {
        subject: `${d.actorName || 'Someone'} unfollowed you`,
        html: shell({
          preheader: 'Follower update from CartSwift.',
          heroEmoji: '👋',
          heroTitle: 'A follower update',
          heroGradient: 'linear-gradient(135deg,#64748b 0%,#475569 100%)',
          body: `<p style="text-align:center"><strong>${d.actorName || 'Someone'}</strong> unfollowed you.</p>
                 <p style="text-align:center;color:#64748b">Don't worry — keep sharing great status posts and you'll attract even more followers.</p>`,
          ctaLabel: 'Post a New Status',
          ctaUrl: `${SITE}/profile`,
        }),
      };
    case 'status_like':
      return {
        subject: `${d.actorName || 'Someone'} reacted ${d.reaction || '❤️'} to your status`,
        html: shell({
          preheader: `New reaction on your CartSwift status`,
          heroEmoji: d.reaction || '❤️',
          heroTitle: 'New status reaction!',
          heroGradient: 'linear-gradient(135deg,#ec4899 0%,#f43f5e 100%)',
          body: `<p style="text-align:center;font-size:16px"><strong>${d.actorName || 'Someone'}</strong> reacted ${d.reaction || '❤️'} to your status.</p>
                 <p style="text-align:center;color:#64748b">Engagement on your status earns you rewards 💰</p>`,
          ctaLabel: 'View My Status',
          ctaUrl: `${SITE}/profile`,
        }),
      };
    case 'status_purchase':
      return {
        subject: `💰 You earned a sale from your status!`,
        html: shell({
          preheader: `${d.buyerName || 'A buyer'} purchased ${d.productTitle} from your status.`,
          heroEmoji: '💰',
          heroTitle: 'Cha-ching! You made a sale',
          heroSubtitle: 'A buyer purchased a product directly from your status post',
          heroGradient: 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
          body: `
            <p><strong>${d.buyerName || 'A buyer'}</strong> just purchased <strong>${d.productTitle}</strong> directly from your tagged status post.</p>
            ${infoBox([
              ['Product', d.productTitle || ''],
              ['Sale amount', fmt(d.amount)],
              ['Your commission', `<span style="color:#10b981">${fmt(d.commission)}</span>`],
            ])}
            <p style="color:#64748b;font-size:13px">Your commission has been added to your wallet balance.</p>
          `,
          ctaLabel: 'View My Wallet',
          ctaUrl: `${SITE}/profile`,
        }),
      };
    default:
      return {
        subject: d.subject || 'CartSwift notification',
        html: shell({
          heroEmoji: '🔔',
          heroTitle: d.subject || 'CartSwift',
          body: `<p>${d.message || ''}</p>`,
        }),
      };
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
