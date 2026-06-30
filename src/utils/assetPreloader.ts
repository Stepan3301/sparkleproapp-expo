/**
 * Asset Preloader
 * ---------------
 * Loads all heavy image assets into Expo's asset cache during app startup.
 * After this runs once, React Native's Image component finds every asset
 * already decoded in memory — no per-screen delay, no re-loading on navigation.
 */

import { Asset } from 'expo-asset';

// ─── All assets that should be warm in cache ─────────────────────────────────
const ASSET_MODULES = [
  // Service category icons (booking screen step 1 — main grid)
  require('../../assets/icon_regular_cleaning.webp'),
  require('../../assets/icon_deep_cleaning.webp'),
  require('../../assets/icon_complete_packages.webp'),
  require('../../assets/icon_window_cleaning.webp'),

  // Complete Packages — individual service icons (grid in step 1)
  require('../../assets/icon_full_villa_deep_cleaning.webp'),
  require('../../assets/icon_full_apartment.webp'),
  require('../../assets/icon_villa_facade.webp'),
  require('../../assets/icon_move_in_out.webp'),
  require('../../assets/icon_post_construction_final.webp'),
  require('../../assets/icon_kitchen_cleaning.webp'),
  require('../../assets/icon_bathroom_deep_cleaning.webp'),

  // Complete Packages — banner images (bottom sheet)
  require('../../assets/banner_full_villa.webp'),
  require('../../assets/banner_full_apartment.webp'),
  require('../../assets/banner_villa_facade.webp'),
  require('../../assets/banner_move_in_out.webp'),
  require('../../assets/banner_post_construction.webp'),
  require('../../assets/banner_kitchen.webp'),
  require('../../assets/banner_bathroom.webp'),

  // Note: system UI icons now use @expo/vector-icons (Ionicons) — no PNG assets needed
];

let preloadPromise: Promise<void> | null = null;

/**
 * Call once from App.tsx.
 * Safe to call multiple times — deduplication is built in.
 */
export async function preloadAssets(): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    try {
      await Asset.loadAsync(ASSET_MODULES);
    } catch (err) {
      // Never block app startup on asset loading failure
      console.warn('[assetPreloader] Failed to preload some assets:', err);
    }
  })();

  return preloadPromise;
}
