-- Add tracking columns to organizations table (only apply with verified custom domains)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tracking_gtm_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tracking_meta_pixel_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tracking_ga4_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tracking_tiktok_pixel_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tracking_custom_scripts TEXT;

-- Comments for documentation
COMMENT ON COLUMN organizations.tracking_enabled IS 'Master toggle for all tracking scripts';
COMMENT ON COLUMN organizations.tracking_gtm_id IS 'Google Tag Manager container ID (GTM-XXXXXXX)';
COMMENT ON COLUMN organizations.tracking_meta_pixel_id IS 'Meta/Facebook Pixel ID (numeric)';
COMMENT ON COLUMN organizations.tracking_ga4_id IS 'Google Analytics 4 Measurement ID (G-XXXXXXXXXX)';
COMMENT ON COLUMN organizations.tracking_tiktok_pixel_id IS 'TikTok Pixel ID (numeric)';
COMMENT ON COLUMN organizations.tracking_custom_scripts IS 'Custom tracking scripts (sanitized HTML/JS)';