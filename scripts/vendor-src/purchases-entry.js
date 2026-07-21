// Bundled once via esbuild (see scripts/build-vendor.sh) into vendor/purchases-capacitor.js,
// then self-hosted and loaded via a plain <script> tag -- same convention as vendor/supabase.js.
// Exposes window.RevenueCatPurchases so index.html never needs a bundler at runtime.
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
window.RevenueCatPurchases = Purchases;
window.RevenueCatLogLevel = LOG_LEVEL;
