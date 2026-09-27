/**
 * Marketing-site constants. Ares is launching exclusively on iOS — point
 * APP_STORE_URL at the real App Store listing once it's live. Until then the
 * buttons fall back to the web sign-up so nothing dead-ends.
 */
export const APP_STORE_URL = "#get"; // TODO: replace with the App Store listing URL at launch
// The app lives on its own subdomain; keep sign-in on that origin so the OAuth
// PKCE flow starts and finishes on one host.
export const WEB_APP_URL = "https://app.aresfitness.xyz/login";
export const SUPPORT_EMAIL = "hello@stellio.com.au";
