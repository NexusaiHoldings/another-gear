/**
 * Server-side predicate helpers for the apparel admin surface.
 *
 * Enforce FTC Textile Act compliance: a SKU may not be activated unless both
 * fiber_content_label and country_of_origin are non-empty.  A story may not be
 * published until its linked consent record is signed.
 */

export interface SkuRow {
  id: string;
  name: string;
  slug: string;
  sku_type: "tee" | "hoodie" | "tank";
  retail_price_cents: number;
  fiber_content_label: string;
  country_of_origin: string;
  active: boolean;
  created_at: string;
}

export interface StoryRow {
  id: string;
  slug: string;
  subject_first_name: string;
  subject_pull_quote: string | null;
  video_embed_url: string | null;
  published_at: string | null;
  consent_record_id: string | null;
  ftc_compensated: boolean;
  created_at: string;
  /** Joined from apparel_interview_subjects via apparel_consent_records. */
  consent_status: "pending" | "signed" | "revoked" | null;
}

/**
 * Returns true only when both FTC-required fields are non-empty strings.
 * Enforced at the API/action level before any DB write.
 */
export function canActivateSku(sku: {
  fiber_content_label: string;
  country_of_origin: string;
}): boolean {
  return sku.fiber_content_label.trim().length > 0 && sku.country_of_origin.trim().length > 0;
}

/**
 * Returns true only when the linked consent record has status 'signed'.
 * The Publish action must call this before setting published_at.
 */
export function canPublishStory(consentStatus: string | null): boolean {
  return consentStatus === "signed";
}

/** Human label for SKU active state shown as a status pill. */
export function skuStatusLabel(active: boolean): "Active" | "Draft" {
  return active ? "Active" : "Draft";
}

/** Human label for interview-subject consent status shown as a badge. */
export function consentBadgeLabel(
  status: string | null,
): "Pending" | "Signed" | "Revoked" {
  if (status === "signed") return "Signed";
  if (status === "revoked") return "Revoked";
  return "Pending";
}
