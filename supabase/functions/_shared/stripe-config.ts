// Centralized Stripe Configuration for Edge Functions
// This file provides a single source of truth for all Stripe-related configurations

// Map Stripe product IDs to subscription tiers
// Includes both PRODUCTION and TEST mode product IDs
export const PRODUCT_TO_TIER: Record<string, "basic" | "pro" | "premium" | "enterprise"> = {
  // Production IDs (USD) - NEW
  "prod_TonJe2av2nOJS7": "basic",
  "prod_TonKTHjbrkLuRT": "basic", // Annual
  "prod_TonJoJd4FUAn1e": "pro",
  "prod_TonK5qhj3EbmjP": "pro", // Annual
  "prod_TonJ2Y3B8MlzGE": "premium",
  "prod_TonKyHdkN3Mr0k": "premium", // Annual
  "prod_TonJ8L27dLZL5P": "enterprise",
  "prod_TonKDi280pPPx6": "enterprise", // Annual
  // Test IDs (keep for testing)
  "prod_ThK1EiE0AtKCIM": "basic",
  "prod_ThK1JlY6NKTIFS": "basic", // Annual
  "prod_ThK1LTy6UcPdrl": "pro",
  "prod_ThK1C9kzAMf4h9": "pro", // Annual
  "prod_ThK1L4ZhLIMS0C": "premium",
  "prod_ThK1pF8uFNd4yB": "premium", // Annual
  "prod_ThK18K9yms0nxs": "enterprise",
  "prod_ThK1X1RtiwN326": "enterprise", // Annual
};

// Subscription limits by tier - SINGLE SOURCE OF TRUTH
export const TIER_LIMITS = {
  basic: { 
    maxActiveRaffles: 2, 
    maxTicketsPerRaffle: 2000, 
    templatesAvailable: 3 
  },
  pro: { 
    maxActiveRaffles: 7, 
    maxTicketsPerRaffle: 30000, 
    templatesAvailable: 6 
  },
  premium: { 
    maxActiveRaffles: 15, 
    maxTicketsPerRaffle: 100000, 
    templatesAvailable: 9 
  },
  enterprise: { 
    maxActiveRaffles: 999, 
    maxTicketsPerRaffle: 10000000,
    templatesAvailable: 9 
  },
} as const;

// All Basic plan price IDs (for trial detection)
export const BASIC_PRICE_IDS = [
  // Test mode
  "price_1SjvNEDPAURVR9VYo48CuIdo", // test monthly
  "price_1SjvNKDPAURVR9VYTaWlJiqR", // test annual
  // Live mode (USD) - NEW
  "price_1Sr9iWANwomfV97eI7ojW9KR", // live monthly
  "price_1Sr9jsANwomfV97efJQopwlu", // live annual
];

// Helper function to get tier from product ID
export function getTierFromProductId(productId: string): "basic" | "pro" | "premium" | "enterprise" {
  return PRODUCT_TO_TIER[productId] || "basic";
}

// Helper function to get limits for a tier
export function getLimitsForTier(tier: "basic" | "pro" | "premium" | "enterprise") {
  return TIER_LIMITS[tier];
}

// Standardized API version for Stripe
export const STRIPE_API_VERSION = "2025-08-27.basil";

// MRR (Monthly Recurring Revenue) values in cents per tier
// Used for analytics and audit logging - SINGLE SOURCE OF TRUTH
export const TIER_MRR_CENTS = {
  monthly: {
    basic: 4900,      // $49/month
    pro: 14900,       // $149/month
    premium: 29900,   // $299/month
    enterprise: 49900, // $499/month
  },
  annual: {
    basic: 4083,      // $490/year = $40.83/month
    pro: 12417,       // $1490/year = $124.17/month
    premium: 24917,   // $2990/year = $249.17/month
    enterprise: 41583, // $4990/year = $415.83/month
  },
} as const;
