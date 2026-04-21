// EmailJS-based transactional email sender with single dynamic template.
// One EmailJS template (vars: subject, to_email, html_body) is reused for ALL emails.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID")!;
const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID")!;
const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY")!;
const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY")!;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APP_URL = "https://cartswift.lovable.app";
const BRAND = {
  name: "CartSwift",
  primary: "#ec4899", // pink-500
  accent: "#f59e0b", // amber-500
  bg: "#0f172a", // slate-900
  text: "#ffffff",
};

// Wrap any image URL through weserv.nl so Gmail/Outlook display it reliably.
function proxyImage(url: string | null | undefined, width = 600): string {
  if (!url) return "";
  const clean = url.replace(/^https?:\/\//, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(clean)}&w=${width}`;
}

function shell(title: string, inner: string, ctaText?: string, ctaUrl?: string) {
  return `
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.accent} 100%);padding:28px 32px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">⚡ ${BRAND.name}</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">${title}</div>
        </td></tr>
        <tr><td style="padding:32px;">${inner}
          ${ctaText && ctaUrl ? `<div style="text-align:center;margin:28px 0 8px;"><a href="${ctaUrl}" style="display:inline-block;background:${BRAND.primary};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">${ctaText}</a></div>` : ""}
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b;">
          <div>You're receiving this because you have an account on ${BRAND.name}.</div>
          <div style="margin-top:6px;"><a href="${APP_URL}" style="color:${BRAND.primary};text-decoration:none;">Visit CartSwift</a> · <a href="${APP_URL}/profile" style="color:${BRAND.primary};text-decoration:none;">Manage notifications</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function profileCard(p: any) {
  if (!p) return "";
  const avatar = proxyImage(p.avatar_url, 120) || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || "User")}&background=ec4899&color=fff&size=120`;
  return `
  <table cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;width:100%;margin:16px 0;">
    <tr>
      <td width="72" valign="top"><img src="${avatar}" width="64" height="64" style="border-radius:50%;display:block;" alt=""></td>
      <td valign="top" style="padding-left:12px;">
        <div style="font-weight:700;font-size:16px;color:#0f172a;">${p.full_name || "User"}</div>
        ${p.email ? `<div style="font-size:13px;color:#64748b;">${p.email}</div>` : ""}
        ${p.bio ? `<div style="font-size:13px;color:#475569;margin-top:6px;">${p.bio}</div>` : ""}
        ${p.followers_count != null ? `<div style="font-size:12px;color:#64748b;margin-top:6px;"><b>${p.followers_count}</b> followers</div>` : ""}
      </td>
    </tr>
  </table>`;
}

function mediaThumb(url: string | null | undefined, isVideo = false) {
  if (!url) return "";
  return `<div style="position:relative;margin:16px 0;text-align:center;"><img src="${proxyImage(url, 600)}" style="max-width:100%;border-radius:12px;display:block;margin:0 auto;" alt="">${isVideo ? '<div style="font-size:13px;color:#64748b;margin-top:8px;">▶︎ Video</div>' : ""}</div>`;
}

function statusMap(lat: number | null, lon: number | null, distanceKm: number | null, eta: string) {
  if (lat == null || lon == null) return "";
  // Static OSM map showing Miami → destination with route
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${(25.7617 + lat) / 2},${(-80.1918 + lon) / 2}&zoom=3&size=560x280&markers=25.7617,-80.1918,red|${lat},${lon},green`;
  return `
  <div style="margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <img src="${mapUrl}" style="width:100%;display:block;" alt="Route map">
    <div style="background:#f8fafc;padding:12px 16px;display:flex;justify-content:space-between;font-size:13px;">
      <div><b style="color:${BRAND.primary};">Distance:</b> ${distanceKm ? distanceKm.toLocaleString() + " km" : "—"}</div>
      <div><b style="color:${BRAND.primary};">ETA:</b> ${eta}</div>
    </div>
  </div>`;
}

// ──────────────────────────────────────────────────────────────────────────
// EMAIL TYPE REGISTRY — each builds { subject, html }
// ──────────────────────────────────────────────────────────────────────────
type Built = { subject: string; html: string };

async function buildEmail(type: string, data: any, profile: any, item: any): Promise<Built> {
  const name = profile?.full_name || data?.userName || "there";

  switch (type) {
    // ── SOCIAL ──
    case "new_follower": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;">👤 New follower!</h2>
        <p style="color:#475569;line-height:1.6;">${data.followerName || "Someone"} just started following you on ${BRAND.name}.</p>
        ${profileCard(data.followerProfile)}`;
      return { subject: `${data.followerName || "Someone"} started following you`, html: shell("New Follower", inner, "View profile", `${APP_URL}/profile/${data.followerId || ""}`) };
    }
    case "post_liked": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;">❤️ ${data.likerName || "Someone"} liked your post</h2>
        ${mediaThumb(data.mediaUrl, data.isVideo)}
        <p style="color:#475569;">Keep it coming — your audience is loving it.</p>`;
      return { subject: `${data.likerName || "Someone"} liked your post`, html: shell("New Like", inner, "Open post", `${APP_URL}/profile`) };
    }
    case "post_commented": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;">💬 New comment</h2>
        <p style="color:#475569;"><b>${data.commenterName || "Someone"}</b> commented:</p>
        <blockquote style="background:#f8fafc;border-left:3px solid ${BRAND.primary};padding:12px 16px;margin:12px 0;border-radius:8px;color:#334155;">${(data.commentText || "").slice(0, 280)}</blockquote>
        ${mediaThumb(data.mediaUrl)}`;
      return { subject: `New comment from ${data.commenterName || "Someone"}`, html: shell("New Comment", inner, "Reply", `${APP_URL}/profile`) };
    }
    case "profile_viewed": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;">👀 Someone viewed your profile</h2>
        ${profileCard(data.viewerProfile)}`;
      return { subject: `Your profile got viewed`, html: shell("Profile View", inner, "See activity", `${APP_URL}/profile`) };
    }
    case "milestone_followers": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;">🎉 ${data.count} followers!</h2>
        <p style="color:#475569;line-height:1.6;">You just hit <b>${data.count} followers</b> on ${BRAND.name}. Time to celebrate!</p>`;
      return { subject: `🎉 You hit ${data.count} followers!`, html: shell("Milestone", inner, "Share the news", `${APP_URL}/profile`) };
    }

    // ── ORDERS / PAYMENTS ──
    case "order_received": {
      const itemsHtml = (data.items || []).map((i: any) => `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">${i.title} × ${i.quantity}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #f1f5f9;">$${(Number(i.price) * Number(i.quantity)).toFixed(2)}</td></tr>`).join("");
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;">✅ Order received, ${name}!</h2>
        <p style="color:#475569;line-height:1.6;">Thanks for your order. We're reviewing your payment now.</p>
        ${data.trackingCode ? `<div style="background:linear-gradient(135deg,${BRAND.primary}15,${BRAND.accent}15);border:1px solid ${BRAND.primary}40;border-radius:12px;padding:16px;margin:16px 0;text-align:center;"><div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Tracking Code</div><div style="font-size:24px;font-weight:800;font-family:monospace;color:${BRAND.primary};margin-top:6px;">${data.trackingCode}</div></div>` : ""}
        <table width="100%" style="margin-top:16px;font-size:14px;">${itemsHtml}<tr><td style="padding:12px 0;font-weight:700;">Total</td><td align="right" style="padding:12px 0;font-weight:700;">$${Number(data.total || 0).toFixed(2)}</td></tr></table>`;
      return { subject: `Order received — ${data.trackingCode || data.orderId}`, html: shell("Order Confirmation", inner, "Track your order", `${APP_URL}/track?code=${data.trackingCode || ""}`) };
    }
    case "payment_approved": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;color:#059669;">✅ Payment approved!</h2>
        <p style="color:#475569;line-height:1.6;">Great news ${name} — your payment for order <b>${data.trackingCode || data.orderId}</b> has been approved. We're preparing your shipment now.</p>`;
      return { subject: `✅ Payment approved — ${data.trackingCode || data.orderId}`, html: shell("Payment Approved", inner, "Track order", `${APP_URL}/track?code=${data.trackingCode || ""}`) };
    }
    case "payment_declined": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;color:#dc2626;">⚠️ Payment needs attention</h2>
        <p style="color:#475569;line-height:1.6;">${name}, we couldn't verify the payment for order <b>${data.trackingCode || data.orderId}</b>.</p>
        ${data.reason ? `<blockquote style="background:#fef2f2;border-left:3px solid #dc2626;padding:12px 16px;margin:12px 0;border-radius:8px;color:#991b1b;">${data.reason}</blockquote>` : ""}
        <p style="color:#475569;">Please re-upload your payment proof or contact us.</p>`;
      return { subject: `Payment issue — ${data.trackingCode || data.orderId}`, html: shell("Payment Declined", inner, "Re-upload proof", `${APP_URL}/checkout`) };
    }
    case "order_live": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;">🚚 Your order is on the move!</h2>
        <p style="color:#475569;line-height:1.6;">Status: <b style="color:${BRAND.primary};text-transform:capitalize;">${(data.status || "shipped").replace(/_/g, " ")}</b></p>
        ${data.description ? `<p style="color:#475569;">${data.description}</p>` : ""}
        ${statusMap(data.lat, data.lon, data.distanceKm, data.eta || "5-10 days")}
        <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:14px;"><b>Destination:</b> ${data.destination || "—"}</div>`;
      return { subject: `🚚 Order ${data.trackingCode || ""} is live`, html: shell("Order Live", inner, "Track on live map", `${APP_URL}/track?code=${data.trackingCode || ""}`) };
    }

    // ── STATUS PURCHASES ──
    case "status_purchase": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;">💰 You made a sale!</h2>
        <p style="color:#475569;line-height:1.6;">${data.buyerName || "A buyer"} just purchased <b>${data.productTitle || "your product"}</b> from your tagged status.</p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;margin:16px 0;text-align:center;"><div style="font-size:12px;color:#166534;">Amount</div><div style="font-size:24px;font-weight:800;color:#15803d;">$${Number(data.amount || 0).toFixed(2)}</div></div>`;
      return { subject: `💰 New sale: $${Number(data.amount || 0).toFixed(2)}`, html: shell("New Sale", inner, "View dashboard", `${APP_URL}/seller-dashboard`) };
    }

    // ── WALLET ──
    case "deposit_approved":
    case "wallet_credit": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;color:#059669;">💵 +$${Number(data.amount || 0).toFixed(2)} added</h2>
        <p style="color:#475569;line-height:1.6;">Your wallet was credited with $${Number(data.amount || 0).toFixed(2)}.${data.note ? ` ${data.note}` : ""}</p>`;
      return { subject: `+$${Number(data.amount || 0).toFixed(2)} added to your wallet`, html: shell("Wallet Credit", inner, "Open wallet", `${APP_URL}/profile`) };
    }
    case "deposit_declined": {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;color:#dc2626;">Deposit declined</h2>
        <p style="color:#475569;line-height:1.6;">Your deposit request was not approved.${data.reason ? ` Reason: ${data.reason}` : ""}</p>`;
      return { subject: `Deposit declined`, html: shell("Deposit", inner, "Try again", `${APP_URL}/profile`) };
    }

    // ── DEFAULT FALLBACK ──
    default: {
      const inner = `<h2 style="margin:0 0 12px;font-size:22px;">${data.title || "Notification"}</h2>
        <p style="color:#475569;line-height:1.6;">${data.body || data.message || ""}</p>`;
      return { subject: data.subject || data.title || "CartSwift notification", html: shell(type, inner, data.ctaText, data.ctaUrl) };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type, userEmail, data = {}, userId, shortId, previewOnly } = body;

    if (!type || !userEmail) {
      return new Response(JSON.stringify({ error: "type and userEmail are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Enrich with profile + item if IDs provided
    let profile: any = null;
    let item: any = null;
    if (userId) {
      const { data: p } = await supabase.from("profiles").select("id,full_name,email,avatar_url,bio,followers_count").eq("id", userId).maybeSingle();
      profile = p;
    }
    if (shortId) {
      const { data: i } = await supabase.from("items").select("id,title,images,price,currency").eq("id", shortId).maybeSingle();
      item = i;
    }

    const built = await buildEmail(type, data, profile, item);

    if (previewOnly) {
      return new Response(JSON.stringify({ success: true, html: built.html, subject: built.subject }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-log
    const { data: logRow } = await supabase
      .from("email_send_log")
      .insert({
        email_type: type,
        recipient_email: userEmail,
        status: "pending",
        metadata: { subject: built.subject, userId, shortId },
      })
      .select("id")
      .single();
    const logId = logRow?.id;

    // Send via EmailJS REST API
    const ejRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: {
          subject: built.subject,
          to_email: userEmail,
          html_body: built.html,
        },
      }),
    });

    const ejText = await ejRes.text();
    if (!ejRes.ok) {
      if (logId) await supabase.from("email_send_log").insert({
        email_type: type,
        recipient_email: userEmail,
        status: "failed",
        error_message: `${ejRes.status} ${ejText}`,
        message_id: logId,
        metadata: { subject: built.subject },
      });
      return new Response(JSON.stringify({ success: false, error: ejText, status: ejRes.status }), {
        status: 200, // Don't fail the caller; email is best-effort
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (logId) await supabase.from("email_send_log").insert({
      email_type: type,
      recipient_email: userEmail,
      status: "sent",
      message_id: logId,
      metadata: { subject: built.subject },
    });

    return new Response(JSON.stringify({ success: true, id: logId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-email error", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
