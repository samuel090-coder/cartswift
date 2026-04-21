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

// Rich hero banner image for emails — uses Unsplash topical photos with weserv proxy.
function heroBanner(topic: string, overlayText?: string): string {
  const url = `https://source.unsplash.com/1200x500/?${encodeURIComponent(topic)}`;
  const proxied = proxyImage(url, 1200);
  return `<div style="position:relative;margin:0 0 20px;border-radius:14px;overflow:hidden;">
    <img src="${proxied}" style="width:100%;height:auto;display:block;" alt="${topic}">
    ${overlayText ? `<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.75));padding:18px 20px;color:#fff;font-size:18px;font-weight:700;">${overlayText}</div>` : ""}
  </div>`;
}

function statCard(label: string, value: string, color = BRAND.primary): string {
  return `<div style="background:linear-gradient(135deg,${color}15,${color}05);border:1px solid ${color}40;border-radius:12px;padding:16px;margin:12px 0;text-align:center;">
    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1.2px;">${label}</div>
    <div style="font-size:26px;font-weight:800;color:${color};margin-top:6px;">${value}</div>
  </div>`;
}

function infoBox(title: string, body: string, color = BRAND.primary): string {
  return `<div style="background:#f8fafc;border-left:4px solid ${color};border-radius:8px;padding:14px 18px;margin:14px 0;">
    <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">${title}</div>
    <div style="color:#475569;font-size:14px;line-height:1.5;">${body}</div>
  </div>`;
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

    // ── 40 RICH ACTIVITY TEMPLATES (each with hero image) ──
    case "welcome": {
      const inner = heroBanner("shopping,celebration,gift", `Welcome to ${BRAND.name}, ${name}! 🎉`) +
        `<p style="color:#475569;line-height:1.7;font-size:15px;">We're thrilled to have you. Discover trending products, follow your favorite sellers, and unlock exclusive deals.</p>` +
        infoBox("🎁 Your welcome gift", "Use code <b>WELCOME10</b> for 10% off your first order.", "#10b981");
      return { subject: `Welcome to ${BRAND.name}, ${name}!`, html: shell("Welcome", inner, "Start shopping", APP_URL) };
    }
    case "email_verified": {
      const inner = heroBanner("verified,checkmark,security", "Email verified ✅") +
        `<p style="color:#475569;line-height:1.7;">Your email is verified. Full access unlocked.</p>`;
      return { subject: "Your email is verified", html: shell("Verified", inner, "Explore", APP_URL) };
    }
    case "password_reset": {
      const inner = heroBanner("security,lock,key", "Password reset 🔐") +
        `<p style="color:#475569;">Click below to reset — link expires in 1 hour.</p>` +
        infoBox("Didn't request this?", "Ignore this email; your password is safe.", "#f59e0b");
      return { subject: "Reset your password", html: shell("Password Reset", inner, "Reset password", data.resetUrl || APP_URL) };
    }
    case "login_alert": {
      const inner = heroBanner("security,laptop,login", "New sign-in detected 🔔") +
        infoBox("Device", `${data.device || "Unknown"} · ${data.location || "Unknown"}`, "#3b82f6") +
        `<p style="color:#475569;">If this wasn't you, secure your account now.</p>`;
      return { subject: "New sign-in to your account", html: shell("Security Alert", inner, "Review activity", `${APP_URL}/profile`) };
    }
    case "cart_abandoned": {
      const inner = heroBanner("shopping cart,sale", "You left something behind 🛒") +
        `<p style="color:#475569;">Your cart is waiting! Complete before items sell out.</p>` +
        statCard("Items in cart", String(data.itemCount || 1), "#ec4899") +
        infoBox("⏰ Limited time", "Use <b>COMEBACK5</b> for 5% off — expires in 24h.", "#f59e0b");
      return { subject: "Your cart misses you 🛒", html: shell("Abandoned Cart", inner, "Complete checkout", `${APP_URL}/cart`) };
    }
    case "wishlist_price_drop": {
      const inner = heroBanner("price tag,discount,sale", `Price dropped! 📉`) +
        mediaThumb(data.imageUrl) +
        statCard("New price", `$${Number(data.newPrice || 0).toFixed(2)}`, "#10b981") +
        infoBox("Was", `<s>$${Number(data.oldPrice || 0).toFixed(2)}</s> — Save $${(Number(data.oldPrice||0)-Number(data.newPrice||0)).toFixed(2)}`, "#ec4899");
      return { subject: `📉 Price drop: ${data.productTitle || "Wishlist item"}`, html: shell("Price Drop", inner, "Buy now", `${APP_URL}/share/${data.shortId || ""}`) };
    }
    case "wishlist_back_in_stock": {
      const inner = heroBanner("warehouse,boxes", "Back in stock! 📦") +
        mediaThumb(data.imageUrl) +
        `<p style="color:#475569;font-size:15px;"><b>${data.productTitle}</b> is back. Grab yours before it sells out.</p>`;
      return { subject: `${data.productTitle} is back in stock`, html: shell("Restock", inner, "Buy now", `${APP_URL}/share/${data.shortId || ""}`) };
    }
    case "flash_sale": {
      const inner = heroBanner("flash sale,lightning,deal", "⚡ FLASH SALE STARTED!") +
        statCard("Discount", `${data.discount || 30}% OFF`, "#ef4444") +
        `<p style="color:#475569;">Hurry — ends in ${data.endsIn || "24h"}.</p>`;
      return { subject: `⚡ Flash Sale: ${data.discount || 30}% off`, html: shell("Flash Sale", inner, "Shop the sale", APP_URL) };
    }
    case "seller_new_product": {
      const inner = heroBanner("new product,launch", `${data.sellerName} just listed something new`) +
        mediaThumb(data.imageUrl) +
        infoBox(data.productTitle || "New listing", `$${Number(data.price || 0).toFixed(2)}`, "#ec4899");
      return { subject: `${data.sellerName} listed a new product`, html: shell("New from Seller", inner, "View product", `${APP_URL}/share/${data.shortId || ""}`) };
    }
    case "seller_live": {
      const inner = heroBanner("live streaming,broadcast", "🔴 LIVE NOW") +
        `<p style="color:#475569;font-size:15px;"><b>${data.sellerName}</b> is live shopping right now. Join for exclusive deals!</p>`;
      return { subject: `🔴 ${data.sellerName} is live now`, html: shell("Live Shopping", inner, "Join live", `${APP_URL}/profile/${data.sellerId || ""}`) };
    }
    case "seller_status_posted": {
      const inner = heroBanner("social media,story", `${data.sellerName} posted a status`) +
        mediaThumb(data.mediaUrl, data.isVideo);
      return { subject: `New status from ${data.sellerName}`, html: shell("New Status", inner, "View status", `${APP_URL}/profile/${data.sellerId || ""}`) };
    }
    case "message_received": {
      const inner = heroBanner("chat,message", `💬 New message from ${data.senderName}`) +
        `<blockquote style="background:#f8fafc;border-left:3px solid ${BRAND.primary};padding:14px 18px;border-radius:8px;color:#334155;">${(data.preview || "").slice(0, 200)}</blockquote>`;
      return { subject: `New message from ${data.senderName}`, html: shell("New Message", inner, "Reply", `${APP_URL}/messages`) };
    }
    case "voice_message_received": {
      const inner = heroBanner("microphone,audio", `🎙️ Voice message from ${data.senderName}`) +
        infoBox("Duration", `${data.duration || 0}s`, "#8b5cf6");
      return { subject: `🎙️ Voice message from ${data.senderName}`, html: shell("Voice Message", inner, "Listen", `${APP_URL}/messages`) };
    }
    case "order_shipped": {
      const inner = heroBanner("shipping,truck", "📦 Your order has shipped!") +
        infoBox("Tracking code", data.trackingCode || "—", "#3b82f6") +
        infoBox("Carrier", data.carrier || "CartSwift Express", "#10b981");
      return { subject: `📦 Order ${data.trackingCode} shipped`, html: shell("Shipped", inner, "Track package", `${APP_URL}/track?code=${data.trackingCode || ""}`) };
    }
    case "out_for_delivery": {
      const inner = heroBanner("delivery,courier", "🚚 Out for delivery today!") +
        `<p style="color:#475569;font-size:15px;">Your order arrives today. Make sure someone's available.</p>`;
      return { subject: `🚚 Out for delivery — ${data.trackingCode}`, html: shell("Out for Delivery", inner, "Track live", `${APP_URL}/track?code=${data.trackingCode || ""}`) };
    }
    case "order_delivered": {
      const inner = heroBanner("delivered,package,happy", "✅ Delivered!") +
        `<p style="color:#475569;font-size:15px;">We'd love to hear what you think!</p>`;
      return { subject: `✅ Delivered — ${data.trackingCode}`, html: shell("Delivered", inner, "Leave a review", `${APP_URL}/orders`) };
    }
    case "order_cancelled": {
      const inner = heroBanner("cancelled,refund", "Order cancelled") +
        `<p style="color:#475569;">Order <b>${data.trackingCode || data.orderId}</b> was cancelled. ${data.reason || ""}</p>` +
        infoBox("Refund", "Refund will appear in 3–5 business days.", "#10b981");
      return { subject: `Order cancelled — ${data.trackingCode}`, html: shell("Cancelled", inner, "Browse again", APP_URL) };
    }
    case "refund_processed": {
      const inner = heroBanner("refund,money back", "💵 Refund processed") +
        statCard("Refund", `$${Number(data.amount || 0).toFixed(2)}`, "#10b981");
      return { subject: `Refund of $${Number(data.amount || 0).toFixed(2)} processed`, html: shell("Refund", inner, "View order", `${APP_URL}/orders`) };
    }
    case "review_request": {
      const inner = heroBanner("review,stars,feedback", "⭐ How was your order?") +
        mediaThumb(data.imageUrl) +
        `<p style="color:#475569;">Help others — share your experience with <b>${data.productTitle || "your purchase"}</b>.</p>`;
      return { subject: `Rate your recent purchase`, html: shell("Review Request", inner, "Leave a review", `${APP_URL}/orders`) };
    }
    case "seller_review_received": {
      const stars = "⭐".repeat(Number(data.rating || 5));
      const inner = heroBanner("five stars,review", `${stars} New review!`) +
        `<blockquote style="background:#fffbeb;border-left:3px solid #f59e0b;padding:14px 18px;border-radius:8px;color:#78350f;">${data.comment || ""}</blockquote>`;
      return { subject: `${stars} New review on your product`, html: shell("New Review", inner, "View dashboard", `${APP_URL}/seller-dashboard`) };
    }
    case "loyalty_tier_upgrade": {
      const inner = heroBanner("trophy,reward,achievement", `🏆 You're now ${data.tier || "Gold"}!`) +
        `<p style="color:#475569;font-size:15px;">Congrats ${name}! Unlocked: free shipping, early access, bonus points.</p>`;
      return { subject: `🏆 You unlocked ${data.tier} status!`, html: shell("Tier Upgrade", inner, "View rewards", `${APP_URL}/profile`) };
    }
    case "loyalty_points_earned": {
      const inner = heroBanner("coins,points,reward", `+${data.points || 0} points earned!`) +
        statCard("Total balance", `${data.balance || 0} pts`, "#f59e0b");
      return { subject: `+${data.points || 0} loyalty points earned`, html: shell("Points Earned", inner, "Redeem", `${APP_URL}/profile`) };
    }
    case "referral_signup": {
      const inner = heroBanner("friends,referral", "🎉 Your friend just joined!") +
        `<p style="color:#475569;">${data.friendName || "Your friend"} signed up via your referral. You'll earn rewards on their first purchase.</p>`;
      return { subject: `${data.friendName} joined via your referral`, html: shell("Referral", inner, "View earnings", `${APP_URL}/profile`) };
    }
    case "referral_reward": {
      const inner = heroBanner("money,bonus", "💰 Referral bonus earned!") +
        statCard("Earned", `$${Number(data.amount || 0).toFixed(2)}`, "#10b981");
      return { subject: `💰 You earned $${Number(data.amount || 0).toFixed(2)} from a referral`, html: shell("Referral Reward", inner, "Withdraw", `${APP_URL}/profile`) };
    }
    case "affiliate_conversion": {
      const inner = heroBanner("commission,sales", "💸 Affiliate commission earned!") +
        statCard("Commission", `$${Number(data.commission || 0).toFixed(2)}`, "#10b981");
      return { subject: `💸 Affiliate commission: $${Number(data.commission || 0).toFixed(2)}`, html: shell("Affiliate", inner, "View dashboard", `${APP_URL}/affiliate`) };
    }
    case "ambassador_approved": {
      const inner = heroBanner("influencer,ambassador,star", "🌟 Welcome, Ambassador!") +
        `<p style="color:#475569;font-size:15px;">Approved! You earn ${data.commissionRate || 10}% on every referred sale.</p>`;
      return { subject: "🌟 Ambassador application approved!", html: shell("Ambassador", inner, "Get your code", `${APP_URL}/ambassador`) };
    }
    case "ambassador_rejected": {
      const inner = heroBanner("decision,review", "Ambassador application update") +
        `<p style="color:#475569;">Unfortunately, we couldn't approve your application this time.${data.reason ? ` ${data.reason}` : ""}</p>`;
      return { subject: "Ambassador application update", html: shell("Application", inner, "Reapply later", `${APP_URL}/ambassador`) };
    }
    case "seller_approved": {
      const inner = heroBanner("store,business,approved", "🎉 You're approved to sell!") +
        `<p style="color:#475569;font-size:15px;">Welcome ${name}! Set up your store and start earning.</p>`;
      return { subject: "🎉 Seller application approved!", html: shell("Seller Approved", inner, "Open dashboard", `${APP_URL}/seller-dashboard`) };
    }
    case "seller_rejected": {
      const inner = heroBanner("review,feedback", "Seller application update") +
        `<p style="color:#475569;">${data.reason || "We couldn't approve your application at this time."}</p>`;
      return { subject: "Seller application update", html: shell("Application", inner, "Reapply", `${APP_URL}/profile`) };
    }
    case "boost_approved": {
      const inner = heroBanner("rocket,boost,growth", "🚀 Your boost is live!") +
        infoBox("Product", data.productTitle || "—", "#ec4899") +
        infoBox("Duration", `${data.duration || 7} days`, "#10b981");
      return { subject: `🚀 Boost active for ${data.productTitle}`, html: shell("Boost Live", inner, "View analytics", `${APP_URL}/seller-dashboard`) };
    }
    case "boost_ended": {
      const inner = heroBanner("analytics,chart", "📊 Boost campaign ended") +
        statCard("Total views", String(data.views || 0), "#3b82f6") +
        statCard("Conversions", String(data.conversions || 0), "#10b981");
      return { subject: `📊 Boost ended — ${data.views || 0} views`, html: shell("Boost Report", inner, "Boost again", `${APP_URL}/seller-dashboard`) };
    }
    case "status_payout": {
      const inner = heroBanner("payout,earnings,money", "💰 Status earnings paid out") +
        statCard("Payout", `$${Number(data.amount || 0).toFixed(2)}`, "#10b981") +
        infoBox("Period", `${data.views || 0} views · ${data.reactions || 0} reactions`, "#8b5cf6");
      return { subject: `💰 $${Number(data.amount || 0).toFixed(2)} status payout`, html: shell("Payout", inner, "View earnings", `${APP_URL}/profile`) };
    }
    case "withdrawal_requested": {
      const inner = heroBanner("withdrawal,bank,transfer", "Withdrawal requested") +
        statCard("Amount", `$${Number(data.amount || 0).toFixed(2)}`, "#3b82f6") +
        `<p style="color:#475569;">Processing time: 1–3 business days.</p>`;
      return { subject: `Withdrawal of $${Number(data.amount || 0).toFixed(2)} received`, html: shell("Withdrawal", inner, "Track", `${APP_URL}/profile`) };
    }
    case "withdrawal_completed": {
      const inner = heroBanner("success,money,bank", "✅ Withdrawal completed") +
        statCard("Sent", `$${Number(data.amount || 0).toFixed(2)}`, "#10b981");
      return { subject: `✅ $${Number(data.amount || 0).toFixed(2)} sent to your account`, html: shell("Sent", inner, "View wallet", `${APP_URL}/profile`) };
    }
    case "gift_card_received": {
      const inner = heroBanner("gift card,present,bow", "🎁 You received a gift card!") +
        statCard("Value", `$${Number(data.amount || 0).toFixed(2)}`, "#ec4899") +
        `<p style="color:#475569;">From: <b>${data.fromName || "A friend"}</b><br>${data.message ? `"${data.message}"` : ""}</p>`;
      return { subject: `🎁 ${data.fromName} sent you a $${Number(data.amount || 0).toFixed(2)} gift card!`, html: shell("Gift Card", inner, "Redeem now", APP_URL) };
    }
    case "birthday": {
      const inner = heroBanner("birthday,cake,celebration", `🎂 Happy Birthday, ${name}!`) +
        `<p style="color:#475569;font-size:15px;">From all of us at ${BRAND.name}, have an amazing day!</p>` +
        statCard("Birthday discount", "20% OFF", "#ec4899") +
        infoBox("Code", "<b>BIRTHDAY20</b> — valid for 7 days", "#f59e0b");
      return { subject: `🎂 Happy Birthday, ${name}! Here's 20% off`, html: shell("Birthday", inner, "Treat yourself", APP_URL) };
    }
    case "trending_alert": {
      const inner = heroBanner("trending,viral,popular", "🔥 Trending right now") +
        mediaThumb(data.imageUrl) +
        infoBox(data.productTitle || "Trending item", `${data.viewCount || 0} views in 24h`, "#ef4444");
      return { subject: `🔥 Trending: ${data.productTitle}`, html: shell("Trending", inner, "Shop trending", `${APP_URL}/share/${data.shortId || ""}`) };
    }
    case "personalized_recommendation": {
      const inner = heroBanner("recommendation,curated", `Picks just for you, ${name}`) +
        mediaThumb(data.imageUrl) +
        `<p style="color:#475569;">Based on your browsing, we think you'll love <b>${data.productTitle}</b>.</p>`;
      return { subject: `We picked ${data.productTitle} for you`, html: shell("For You", inner, "View product", `${APP_URL}/share/${data.shortId || ""}`) };
    }
    case "weekly_digest": {
      const inner = heroBanner("newsletter,weekly,roundup", `Your week on ${BRAND.name}`) +
        statCard("New products", String(data.newProducts || 0), "#ec4899") +
        statCard("Trending sellers", String(data.trendingSellers || 0), "#3b82f6") +
        statCard("Active deals", String(data.deals || 0), "#10b981");
      return { subject: `Your weekly ${BRAND.name} digest`, html: shell("Weekly Digest", inner, "Browse now", APP_URL) };
    }
    case "we_miss_you": {
      const inner = heroBanner("comeback,welcome back", `We miss you, ${name} 💔`) +
        `<p style="color:#475569;font-size:15px;">It's been a while! Here's a special welcome-back offer:</p>` +
        statCard("Discount", "15% OFF", "#ec4899") +
        infoBox("Code", "<b>COMEBACK15</b> — valid for 14 days", "#f59e0b");
      return { subject: `We miss you, ${name} 💔 Here's 15% off`, html: shell("Come Back", inner, "Shop now", APP_URL) };
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
