export const APPAREL_DDL = `
CREATE TABLE IF NOT EXISTS apparel_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  photo_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apparel_subjects_created_at ON apparel_subjects(created_at);

CREATE TABLE IF NOT EXISTS apparel_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES apparel_subjects(id) ON DELETE SET NULL,
  pull_quote TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE apparel_stories ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES apparel_subjects(id) ON DELETE SET NULL;
ALTER TABLE apparel_stories ADD COLUMN IF NOT EXISTS pull_quote TEXT DEFAULT '';
ALTER TABLE apparel_stories ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE apparel_stories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_apparel_stories_subject_id ON apparel_stories(subject_id);
CREATE INDEX IF NOT EXISTS idx_apparel_stories_published_at ON apparel_stories(published_at);
CREATE INDEX IF NOT EXISTS idx_apparel_stories_status ON apparel_stories(status);

CREATE TABLE IF NOT EXISTS apparel_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE apparel_skus ADD COLUMN IF NOT EXISTS sku TEXT DEFAULT '';
ALTER TABLE apparel_skus ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE apparel_skus ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_apparel_skus_status ON apparel_skus(status);
CREATE INDEX IF NOT EXISTS idx_apparel_skus_sku ON apparel_skus(sku);

CREATE TABLE IF NOT EXISTS apparel_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  total_cents INTEGER NOT NULL DEFAULT 0,
  printful_order_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE apparel_orders ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE apparel_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE apparel_orders ADD COLUMN IF NOT EXISTS total_cents INTEGER DEFAULT 0;
ALTER TABLE apparel_orders ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_apparel_orders_email ON apparel_orders(email);
CREATE INDEX IF NOT EXISTS idx_apparel_orders_status ON apparel_orders(status);
CREATE INDEX IF NOT EXISTS idx_apparel_orders_created_at ON apparel_orders(created_at);
`;
