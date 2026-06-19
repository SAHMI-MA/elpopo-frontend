/* ===================================================================
   SITE CONFIG — single source of client-editable values
   -------------------------------------------------------------------
   The CLIENT only edits this file (plus backend/data/products.js for
   prices and backend/.env for secret keys). The rest of the app reads
   from window.SITE_CONFIG below.

   IMPORTANT: anything here ships to the browser. Never put SECRET
   keys (sk_..., PayPal client secret, webhook secret) in this file —
   those live in backend/.env only.
   =================================================================== */

window.SITE_CONFIG = {
  /* --- Business identity ------------------------------------------- */
  businessName: 'REFRAME LAYERS',
  businessEmail: 'elpopo@elpopoacademy.com',
  phoneNumber: '',                // e.g. '+1 555 123 4567' — leave '' to hide
  whatsappNumber: '15551234567',  // digits only, no '+' or spaces
  whatsappMessage: "Hi, I'd like to learn more about the program.",

  /* --- Branding ---------------------------------------------------- */
  logo: 'assets/images/logo.png',           // header + hero
  logoSeal: 'assets/images/logo-seal.jpg',  // footer seal
  motto: 'Excellentia · Audacia · Legatum',

  /* --- Social links ------------------------------------------------ */
  social: {
    instagram: '',
    facebook: '',
    youtube: '',
    linkedin: '',
    tiktok: '',
    x: '',
  },

  /* --- Calendar / booking ------------------------------------------ */
  // CLIENT: Replace this with your real Calendly event link.
  // Example: https://calendly.com/yourname/30min
  // How to find it: log in at calendly.com -> Event Types -> click the gear
  // on the meeting you want -> "Copy link". Leave as the demo URL below
  // until the client provides their own (the modal will still load).
  calendlyUrl: 'https://calendly.com/aji/30min',

  /* --- Media: paths the page should pull videos/images from -------- */
  // Drop the files into frontend/assets/videos/ and frontend/assets/images/
  // using these filenames, OR edit the paths to point elsewhere.
  videos: {
    hero:        { src: 'https://sahmi.ma/video1.mp4',    poster: 'assets/images/hero-poster.jpg' }, 
    productDemo: { src: 'assets/videos/product-demo.mp4', poster: 'assets/images/product-poster.jpg' },
    about:       { src: 'assets/videos/about.mp4',        poster: 'assets/images/about-poster.jpg' },
  },
  images: {
    heroBackground: 'assets/images/hero-bg.jpg',
    aboutPortrait:  'assets/images/about-portrait.jpg',
  },

  /* --- Payment configuration --------------------------------------- */
  // Base URL of the backend API. Empty string '' = same origin (recommended
  // when backend serves the frontend). Use full URL when frontend and
  // backend are on different hosts/ports (e.g. 'http://localhost:5000').
  apiBaseUrl: 'https://backend-elpopo-production.up.railway.app',

  // Stripe PUBLISHABLE key — safe to expose. Must be the pk_live_... in
  // production or pk_test_... in test mode. Must match backend STRIPE_SECRET_KEY mode.
  stripePublishableKey: 'pk_live_51TMLZRQQKNMt9hrrYRO1ksUIeVv55sXOGtLUCfB5aK1RgwXhW17RNEa7KDAhHrD91gbhCCA6Jos6MmFk7Y8GpmYx00HiluIvX0',

  // PayPal CLIENT ID (publishable) — safe to expose. Used only if you embed
  // the PayPal JS SDK on the frontend. The redirect/REST flow does not need it.
  paypalClientId: '',

  // Which Stripe flow to use:
  //   'elements' = in-page card form (current modal, no redesign)
  //   'redirect' = redirect to Stripe Checkout page
  stripeFlow: 'elements',

  // Optional fallback paypal.me link if the backend PayPal Orders flow is not configured.
  paypalFallbackUrl: 'https://paypal.me/elpopooacademy',

  /* --- Post-checkout redirect URLs --------------------------------- */
  // Used by the redirect-style flows (Stripe Checkout + PayPal). The
  // backend also has SUCCESS_URL / CANCEL_URL in .env — keep them consistent.
  successUrl: '/success.html',
  cancelUrl:  '/cancel.html',
};
