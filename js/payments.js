/* ===================================================================
   payments.js — clean redirect-style payment handlers
   -------------------------------------------------------------------
   The in-page Stripe Elements flow in app.js stays as the default
   (no redesign). This file provides the alternative flows the backend
   exposes:

     * Stripe Checkout (redirect to Stripe-hosted page)
     * PayPal Orders v2 (redirect to PayPal, backend captures after approval)

   To switch the modal's PAY SECURELY button to the Stripe Checkout
   flow, set SITE_CONFIG.stripeFlow = 'redirect' in config.js.
   =================================================================== */

(function () {
  'use strict';

  const cfg = window.SITE_CONFIG || {};
  const api = (cfg.apiBaseUrl || '').replace(/\/+$/, '');

  async function postJson(path, body) {
    const r = await fetch(api + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    let data = {};
    try { data = await r.json(); } catch (_) { /* ignore */ }
    if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
    return data;
  }

  // ---- Stripe Checkout Session ----
  async function startStripeCheckout({ productKey, name, email }) {
    const { url } = await postJson('/api/checkout/stripe', { productKey, name, email });
    if (!url) throw new Error('Checkout session URL missing.');
    window.location.href = url;
  }

  // ---- PayPal Orders v2 (backend creates, browser redirects to approveUrl) ----
  async function startPayPalCheckout({ productKey, name, email }) {
    const { approveUrl } = await postJson('/api/checkout/paypal', { productKey, name, email });
    if (!approveUrl) throw new Error('PayPal approve URL missing.');
    window.location.href = approveUrl;
  }

  window.Payments = {
    startStripeCheckout,
    startPayPalCheckout,
  };
})();
