export const APPAREL_DDL = `
CREATE TABLE IF NOT EXISTS apparel_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_first_name text NOT NULL,
  subject_photo_url text NOT NULL,
  pull_quote_excerpt text NOT NULL,
  story_html text,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apparel_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  photo_url text,
  bio text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apparel_skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  price_cents integer NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apparel_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_cents integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apparel_stories_published_at ON apparel_stories(published_at DESC);
`;
