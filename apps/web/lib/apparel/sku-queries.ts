/**
 * Apparel SKU data access (F5-003: Story-Linked Product Shop).
 *
 * Server-only reads from apparel_skus, apparel_stories, apparel_story_skus.
 * Follows the pg singleton Pool pattern from lib/blog.ts — preview builds
 * without DATABASE_URL still compile; queries degrade gracefully to []/null.
 */

export interface PrintfulVariant {
  size: string;
  variant_id: string;
}

export interface SkuSummary {
  id: string;
  name: string;
  slug: string;
  sku_type: "tee" | "hoodie" | "tank";
  retail_price_cents: number;
  active: boolean;
  story_slug: string | null;
  story_teaser: string | null;
  subject_first_name: string | null;
}

export interface SkuDetail {
  id: string;
  name: string;
  slug: string;
  sku_type: "tee" | "hoodie" | "tank";
  retail_price_cents: number;
  active: boolean;
  printful_product_id: string | null;
  printful_variant_ids: unknown[];
  fiber_content_label: string;
  country_of_origin: string;
  story_id: string | null;
  story_slug: string | null;
  subject_first_name: string | null;
  subject_pull_quote: string | null;
  video_embed_url: string | null;
  body_markdown: string | null;
  ftc_compensated: boolean;
  published_at: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pool: any = null;

function getPool(): {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
} {
  if (_pool) return _pool;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool: PgPool } = require("pg") as {
    Pool: new (config: Record<string, unknown>) => {
      query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    };
  };
  _pool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
  });
  return _pool;
}

/**
 * Normalize the JSONB printful_variant_ids field into typed variant objects.
 * Handles arrays of objects (with size/variant_id keys) or bare ID strings/numbers.
 */
export function normalizeVariants(raw: unknown): PrintfulVariant[] {
  if (!Array.isArray(raw)) return [];
  const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "2XL"];
  return raw.map((item, idx) => {
    if (typeof item === "object" && item !== null) {
      const rec = item as Record<string, unknown>;
      return {
        size: String(rec.size ?? STANDARD_SIZES[idx] ?? `Size ${idx + 1}`),
        variant_id: String(rec.variant_id ?? rec.id ?? String(idx)),
      };
    }
    return {
      size: STANDARD_SIZES[idx] ?? `Size ${idx + 1}`,
      variant_id: String(item),
    };
  });
}

/**
 * Convert a YouTube or TikTok share URL to its corresponding embed URL.
 * If the URL is already an embed URL or an unrecognized format, returns it as-is.
 */
export function getVideoEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.includes("/embed/")) return url;

  // YouTube: https://www.youtube.com/watch?v=VIDEO_ID
  const ytWatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;

  // YouTube short link: https://youtu.be/VIDEO_ID
  const ytShort = url.match(/youtu\.be\/([^?&]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;

  // TikTok: https://www.tiktok.com/@handle/video/VIDEO_ID
  const ttVideo = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (ttVideo) return `https://www.tiktok.com/embed/v2/${ttVideo[1]}`;

  return url;
}

export async function listActiveSkus(): Promise<SkuSummary[]> {
  try {
    const { rows } = await getPool().query(
      `SELECT
         s.id,
         s.name,
         s.slug,
         s.sku_type,
         s.retail_price_cents,
         s.active,
         st.slug              AS story_slug,
         st.subject_pull_quote AS story_teaser,
         st.subject_first_name
       FROM apparel_skus s
       LEFT JOIN apparel_story_skus ss ON ss.sku_id = s.id
       LEFT JOIN apparel_stories st
         ON st.id = ss.story_id
         AND st.published_at IS NOT NULL
         AND st.published_at <= now()
       WHERE s.active = TRUE
       ORDER BY s.created_at DESC`,
    );
    return (rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      slug: String(r.slug),
      sku_type: r.sku_type as "tee" | "hoodie" | "tank",
      retail_price_cents: Number(r.retail_price_cents),
      active: Boolean(r.active),
      story_slug: r.story_slug ? String(r.story_slug) : null,
      story_teaser: r.story_teaser ? String(r.story_teaser) : null,
      subject_first_name: r.subject_first_name ? String(r.subject_first_name) : null,
    }));
  } catch {
    return [];
  }
}

export async function getSkuWithStory(slug: string): Promise<SkuDetail | null> {
  try {
    const { rows } = await getPool().query(
      `SELECT
         s.id,
         s.name,
         s.slug,
         s.sku_type,
         s.retail_price_cents,
         s.active,
         s.printful_product_id,
         s.printful_variant_ids,
         s.fiber_content_label,
         s.country_of_origin,
         st.id                  AS story_id,
         st.slug                AS story_slug,
         st.subject_first_name,
         st.subject_pull_quote,
         st.video_embed_url,
         st.body_markdown,
         st.ftc_compensated,
         st.published_at
       FROM apparel_skus s
       LEFT JOIN apparel_story_skus ss ON ss.sku_id = s.id
       LEFT JOIN apparel_stories st ON st.id = ss.story_id
       WHERE s.slug = $1
       LIMIT 1`,
      [slug],
    );
    const r = (rows as Record<string, unknown>[])[0];
    if (!r) return null;
    return {
      id: String(r.id),
      name: String(r.name),
      slug: String(r.slug),
      sku_type: r.sku_type as "tee" | "hoodie" | "tank",
      retail_price_cents: Number(r.retail_price_cents),
      active: Boolean(r.active),
      printful_product_id: r.printful_product_id ? String(r.printful_product_id) : null,
      printful_variant_ids: Array.isArray(r.printful_variant_ids) ? r.printful_variant_ids : [],
      fiber_content_label: String(r.fiber_content_label ?? ""),
      country_of_origin: String(r.country_of_origin ?? ""),
      story_id: r.story_id ? String(r.story_id) : null,
      story_slug: r.story_slug ? String(r.story_slug) : null,
      subject_first_name: r.subject_first_name ? String(r.subject_first_name) : null,
      subject_pull_quote: r.subject_pull_quote ? String(r.subject_pull_quote) : null,
      video_embed_url: r.video_embed_url ? String(r.video_embed_url) : null,
      body_markdown: r.body_markdown ? String(r.body_markdown) : null,
      ftc_compensated: Boolean(r.ftc_compensated),
      published_at: r.published_at ? String(r.published_at) : null,
    };
  } catch {
    return null;
  }
}

/** Used by generateStaticParams to pre-build all known SKU detail pages. */
export async function listAllSkuSlugs(): Promise<string[]> {
  try {
    const { rows } = await getPool().query(
      `SELECT slug FROM apparel_skus WHERE active = TRUE ORDER BY created_at DESC`,
    );
    return (rows as Record<string, unknown>[]).map((r) => String(r.slug));
  } catch {
    return [];
  }
}
