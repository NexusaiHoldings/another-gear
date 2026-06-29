/**
 * Apparel domain schema (F3-DT001).
 *
 * Tracks Printful fulfillment orders created after payment_intent.succeeded.
 * Picked up by packages/db/migrate.ts via the *_DDL constant convention.
 */
export const APPAREL_DDL = `
CREATE TABLE IF NOT EXISTS apparel_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text NOT NULL,
  printful_order_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  recipient_name text,
  recipient_email text,
  shipping_address jsonb,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  printful_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apparel_orders_payment_intent
  ON apparel_orders (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_apparel_orders_printful_id
  ON apparel_orders (printful_order_id);
ALTER TABLE apparel_orders ADD COLUMN IF NOT EXISTS recipient_email text;
ALTER TABLE apparel_orders ADD COLUMN IF NOT EXISTS printful_response jsonb;
`;
