export const APPAREL_DDL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE IF NOT EXISTS apparel_sku_type AS ENUM ('tee', 'hoodie', 'tank');
CREATE TYPE IF NOT EXISTS apparel_consent_status AS ENUM ('pending', 'signed', 'revoked');

CREATE TABLE IF NOT EXISTS apparel_interview_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  email text NOT NULL,
  consent_status apparel_consent_status NOT NULL DEFAULT 'pending',
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apparel_interview_subjects_email_key UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS apparel_skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  sku_type apparel_sku_type NOT NULL,
  retail_price_cents integer NOT NULL,
  printful_product_id text,
  printful_variant_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  fiber_content_label text NOT NULL,
  country_of_origin text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apparel_skus_slug_key UNIQUE (slug),
  CONSTRAINT apparel_skus_retail_price_cents_check CHECK (retail_price_cents >= 0)
);

CREATE TABLE IF NOT EXISTS apparel_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  subject_first_name text NOT NULL,
  subject_pull_quote text,
  video_embed_url text,
  body_markdown text NOT NULL,
  published_at timestamptz,
  consent_record_id uuid,
  ftc_compensated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apparel_stories_slug_key UNIQUE (slug),
  CONSTRAINT apparel_stories_published_requires_consent CHECK (
    published_at IS NULL OR consent_record_id IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS apparel_story_skus (
  story_id uuid NOT NULL,
  sku_id uuid NOT NULL,
  PRIMARY KEY (story_id, sku_id),
  CONSTRAINT apparel_story_skus_story_id_fkey FOREIGN KEY (story_id) REFERENCES apparel_stories(id) ON DELETE CASCADE,
  CONSTRAINT apparel_story_skus_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES apparel_skus(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS apparel_consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  story_id uuid NOT NULL,
  release_document_url text NOT NULL,
  signed_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apparel_consent_records_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES apparel_interview_subjects(id) ON DELETE CASCADE,
  CONSTRAINT apparel_consent_records_story_id_fkey FOREIGN KEY (story_id) REFERENCES apparel_stories(id) ON DELETE CASCADE,
  CONSTRAINT apparel_consent_records_subject_story_key UNIQUE (subject_id, story_id),
  CONSTRAINT apparel_consent_records_story_id_key UNIQUE (story_id)
);

CREATE INDEX IF NOT EXISTS apparel_story_skus_sku_id_idx ON apparel_story_skus (sku_id);
CREATE INDEX IF NOT EXISTS apparel_stories_published_at_idx ON apparel_stories (published_at);
CREATE INDEX IF NOT EXISTS apparel_skus_active_idx ON apparel_skus (active);
CREATE UNIQUE INDEX IF NOT EXISTS apparel_stories_consent_record_id_idx ON apparel_stories (consent_record_id) WHERE consent_record_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'apparel_stories_consent_record_id_fkey'
  ) THEN
    ALTER TABLE apparel_stories
    ADD CONSTRAINT apparel_stories_consent_record_id_fkey
    FOREIGN KEY (consent_record_id)
    REFERENCES apparel_consent_records(id)
    ON DELETE SET NULL;
  END IF;
END
$$;
`;
