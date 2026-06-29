export const APPAREL_SUBJECTS_DDL = `
CREATE TABLE IF NOT EXISTS apparel_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  photo_url text,
  bio text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
`;

export const APPAREL_STORIES_DDL = `
CREATE TABLE IF NOT EXISTS apparel_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES apparel_subjects(id),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  pull_quote_excerpt text,
  content text,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
`;

export const APPAREL_SKUS_DDL = `
CREATE TABLE IF NOT EXISTS apparel_skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  image_url text,
  inventory_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
`;

export const APPAREL_ORDERS_DDL = `
CREATE TABLE IF NOT EXISTS apparel_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_cents integer NOT NULL DEFAULT 0,
  printful_order_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
`;
