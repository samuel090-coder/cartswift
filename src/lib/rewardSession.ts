// Session helpers for the Smart Rewards Ecosystem
const SESSION_KEY = 'sr_session_id';
const SEEN_KEY = 'sr_popup_seen';
const CLAIM_KEY = 'sr_active_claim';

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function markPopupSeen() {
  localStorage.setItem(SEEN_KEY, String(Date.now()));
}
export function hasSeenPopup(): boolean {
  return !!localStorage.getItem(SEEN_KEY);
}

export function setActiveClaim(claim: any) {
  localStorage.setItem(CLAIM_KEY, JSON.stringify(claim));
}
export function getActiveClaim<T = any>(): T | null {
  const s = localStorage.getItem(CLAIM_KEY);
  return s ? JSON.parse(s) : null;
}
export function clearActiveClaim() {
  localStorage.removeItem(CLAIM_KEY);
}

export function loadPaystack(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).PaystackPop) return resolve((window as any).PaystackPop);
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.onload = () => resolve((window as any).PaystackPop);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
