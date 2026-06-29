export const APPAREL_DDL = /* sql */ `
DO $$ BEGIN
  CREATE TYPE apparel_sku_type AS ENUM ('tee', 'hoodie', 'tank');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE apparel_consent_status AS ENUM ('pending', 'signed', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS apparel_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku_type apparel_sku_type NOT NULL,
  retail_price_cents INTEGER NOT NULL CHECK (retail_price_cents >= 0),
  printful_product_id TEXT,
  printful_variant_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  fiber_content_label TEXT NOT NULL,
  country_of_origin TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS apparel_interview_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  consent_status apparel_consent_status NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS apparel_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  subject_first_name TEXT NOT NULL,
  subject_pull_quote TEXT,
  video_embed_url TEXT,
  body_markdown TEXT,
  published_at TIMESTAMPTZ,
  consent_record_id UUID,
  ftc_compensated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT apparel_stories_consent_requirement CHECK (
    published_at IS NULL OR consent_record_id IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS apparel_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES apparel_interview_subjects(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES apparel_stories(id) ON DELETE CASCADE,
  release_document_url TEXT NOT NULL,
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (story_id)
);

CREATE TABLE IF NOT EXISTS apparel_story_skus (
  story_id UUID NOT NULL REFERENCES apparel_stories(id) ON DELETE CASCADE,
  sku_id UUID NOT NULL REFERENCES apparel_skus(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, sku_id)
);

DO $$
BEGIN
  ALTER TABLE apparel_stories
    ADD CONSTRAINT apparel_stories_consent_record_id_fk
    FOREIGN KEY (consent_record_id)
    REFERENCES apparel_consent_records(id)
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
`;
