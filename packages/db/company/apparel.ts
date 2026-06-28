/**
 * Apparel domain schema — Printful order fulfillment tracking.
 *
 * Picked up by packages/db/migrate.ts via the *_DDL constant convention.
 */
export const APPAREL_DDL = `
CREATE TABLE IF NOT EXISTS apparel_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text UNIQUE NOT NULL,
  printful_order_id text,
  printful_status text NOT NULL DEFAULT 'pending',
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apparel_orders_payment_intent
  ON apparel_orders (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_apparel_orders_printful_order
  ON apparel_orders (printful_order_id) WHERE printful_order_id IS NOT NULL;
`;
