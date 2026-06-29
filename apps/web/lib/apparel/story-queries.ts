export interface StoryCard {
  slug: string;
  subject_first_name: string;
  subject_pull_quote: string | null;
  published_at: string;
  ftc_compensated: boolean;
}

export interface StorySku {
  slug: string;
  name: string;
  retail_price_cents: number;
  sku_type: string;
}

export interface Story {
  id: string;
  slug: string;
  subject_first_name: string;
  subject_pull_quote: string | null;
  video_embed_url: string | null;
  body_markdown: string | null;
  published_at: string;
  ftc_compensated: boolean;
  skus: StorySku[];
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

export async function listPublishedStories(limit = 50): Promise<StoryCard[]> {
  try {
    const { rows } = await getPool().query(
      `SELECT slug, subject_first_name, subject_pull_quote, published_at, ftc_compensated
         FROM apparel_stories
        WHERE published_at IS NOT NULL
          AND published_at <= timezone('utc', now())
        ORDER BY published_at DESC
        LIMIT $1`,
      [limit],
    );
    return (rows as Record<string, unknown>[]).map((r) => ({
      slug: String(r.slug),
      subject_first_name: String(r.subject_first_name),
      subject_pull_quote: r.subject_pull_quote ? String(r.subject_pull_quote) : null,
      published_at: r.published_at instanceof Date
        ? (r.published_at as Date).toISOString()
        : String(r.published_at),
      ftc_compensated: Boolean(r.ftc_compensated),
    }));
  } catch {
    return [];
  }
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  try {
    const { rows } = await getPool().query(
      `SELECT id, slug, subject_first_name, subject_pull_quote,
              video_embed_url, body_markdown, published_at, ftc_compensated
         FROM apparel_stories
        WHERE slug = $1
          AND published_at IS NOT NULL
          AND published_at <= timezone('utc', now())
        LIMIT 1`,
      [slug],
    );
    const r = (rows as Record<string, unknown>[])[0];
    if (!r) return null;

    const storyId = String(r.id);

    const { rows: skuRows } = await getPool().query(
      `SELECT sk.slug, sk.name, sk.retail_price_cents, sk.sku_type
         FROM apparel_story_skus ss
         JOIN apparel_skus sk ON sk.id = ss.sku_id
        WHERE ss.story_id = $1
          AND sk.active = true
        ORDER BY sk.name`,
      [storyId],
    );

    const skus: StorySku[] = (skuRows as Record<string, unknown>[]).map((sk) => ({
      slug: String(sk.slug),
      name: String(sk.name),
      retail_price_cents: Number(sk.retail_price_cents),
      sku_type: String(sk.sku_type),
    }));

    return {
      id: storyId,
      slug: String(r.slug),
      subject_first_name: String(r.subject_first_name),
      subject_pull_quote: r.subject_pull_quote ? String(r.subject_pull_quote) : null,
      video_embed_url: r.video_embed_url ? String(r.video_embed_url) : null,
      body_markdown: r.body_markdown ? String(r.body_markdown) : null,
      published_at: r.published_at instanceof Date
        ? (r.published_at as Date).toISOString()
        : String(r.published_at),
      ftc_compensated: Boolean(r.ftc_compensated),
      skus,
    };
  } catch {
    return null;
  }
}
