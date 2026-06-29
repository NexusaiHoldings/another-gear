export const APPAREL_ENUMS_DDL = `
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'apparel_sku_type') THEN
        CREATE TYPE apparel_sku_type AS ENUM ('tee', 'hoodie', 'tank');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'apparel_consent_status') THEN
        CREATE TYPE apparel_consent_status AS ENUM ('pending', 'signed', 'revoked');
    END IF;
END $$;
`;

export const APPAREL_INTERVIEW_SUBJECTS_DDL = `
CREATE TABLE IF NOT EXISTS apparel_interview_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    email TEXT NOT NULL,
    consent_status apparel_consent_status NOT NULL DEFAULT 'pending',
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (email)
);
`;

export const APPAREL_SKUS_DDL = `
CREATE TABLE IF NOT EXISTS apparel_skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sku_type apparel_sku_type NOT NULL,
    retail_price_cents INTEGER NOT NULL,
    printful_product_id TEXT NOT NULL,
    printful_variant_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    fiber_content_label TEXT NOT NULL,
    country_of_origin TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

export const APPAREL_STORIES_DDL = `
CREATE TABLE IF NOT EXISTS apparel_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    subject_first_name TEXT NOT NULL,
    subject_pull_quote TEXT,
    video_embed_url TEXT,
    body_markdown TEXT,
    published_at TIMESTAMPTZ,
    consent_record_id UUID UNIQUE,
    ftc_compensated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT apparel_stories_publish_requires_consent CHECK (published_at IS NULL OR consent_record_id IS NOT NULL)
);
`;

export const APPAREL_STORY_SKUS_DDL = `
CREATE TABLE IF NOT EXISTS apparel_story_skus (
    story_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (story_id, sku_id),
    FOREIGN KEY (story_id) REFERENCES apparel_stories(id) ON DELETE CASCADE,
    FOREIGN KEY (sku_id) REFERENCES apparel_skus(id) ON DELETE CASCADE
);
`;

export const APPAREL_CONSENT_RECORDS_DDL = `
CREATE TABLE IF NOT EXISTS apparel_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    story_id UUID NOT NULL,
    release_document_url TEXT NOT NULL,
    signed_at TIMESTAMPTZ,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (story_id),
    FOREIGN KEY (subject_id) REFERENCES apparel_interview_subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (story_id) REFERENCES apparel_stories(id) ON DELETE CASCADE
);
`;

export const APPAREL_STORIES_CONSENT_FK_DDL = `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'apparel_stories_consent_record_id_fkey'
          AND table_name = 'apparel_stories'
          AND table_schema = current_schema()
    ) THEN
        ALTER TABLE apparel_stories
        ADD CONSTRAINT apparel_stories_consent_record_id_fkey
        FOREIGN KEY (consent_record_id)
        REFERENCES apparel_consent_records (id)
        ON DELETE SET NULL;
    END IF;
END $$;
`;
