/**
 * Agent tool handler: submit_printful_order
 *
 * Creates a Printful fulfillment order via the Printful REST API using line
 * items and shipping address from the verified Stripe payment intent, then
 * persists the Printful order ID and initial status to apparel_orders.
 *
 * Autonomy class: mutation — routes through the cross-boundary bridge after
 * user confirmation.
 */

import type { HandlerContext, HandlerResult } from "@nexus/identity-and-access";

interface LineItem {
  variant_id: number;
  quantity: number;
  name?: string;
}

interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  phone?: string;
  email?: string;
}

interface SubmitPrintfulOrderArgs {
  payment_intent_id: string;
  line_items: LineItem[];
  shipping: ShippingAddress;
}

interface PrintfulOrderResponse {
  code: number;
  result: {
    id: number;
    status: string;
    external_id?: string;
  };
}

export async function handleSubmitPrintfulOrder(
  ctx: HandlerContext,
  args: Record<string, unknown>
): Promise<HandlerResult> {
  const { payment_intent_id, line_items, shipping } = args as unknown as SubmitPrintfulOrderArgs;

  if (!payment_intent_id || typeof payment_intent_id !== "string") {
    return { status: 400, body: "payment_intent_id is required" };
  }
  if (!Array.isArray(line_items) || line_items.length === 0) {
    return { status: 400, body: "line_items must be a non-empty array" };
  }
  if (!shipping || typeof shipping !== "object") {
    return { status: 400, body: "shipping address is required" };
  }

  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    return { status: 500, body: "PRINTFUL_API_KEY is not configured" };
  }

  // Upsert a pending record so we have a row even if the Printful call fails.
  await ctx.db.query(
    `INSERT INTO apparel_orders (payment_intent_id, line_items, shipping_address)
     VALUES ($1, $2, $3)
     ON CONFLICT (payment_intent_id) DO NOTHING`,
    [
      payment_intent_id,
      JSON.stringify(line_items),
      JSON.stringify(shipping),
    ]
  );

  // Build the Printful order payload.
  const printfulItems = line_items.map((item) => ({
    sync_variant_id: item.variant_id,
    quantity: item.quantity,
  }));

  const orderPayload = {
    external_id: payment_intent_id,
    shipping: "STANDARD",
    recipient: {
      name: shipping.name,
      address1: shipping.address1,
      address2: shipping.address2 ?? "",
      city: shipping.city,
      state_code: shipping.state_code,
      country_code: shipping.country_code,
      zip: shipping.zip,
      phone: shipping.phone ?? "",
      email: shipping.email ?? "",
    },
    items: printfulItems,
  };

  let printfulOrderId: string;
  let printfulStatus: string;

  try {
    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const data = (await response.json()) as PrintfulOrderResponse;

    if (!response.ok || data.code < 200 || data.code >= 300) {
      const errMsg = JSON.stringify(data);
      await ctx.db.query(
        `UPDATE apparel_orders
         SET printful_status = 'failed', error_message = $2, updated_at = now()
         WHERE payment_intent_id = $1`,
        [payment_intent_id, errMsg]
      );
      return {
        status: 502,
        body: `Printful API error: ${errMsg}`,
      };
    }

    printfulOrderId = String(data.result.id);
    printfulStatus = data.result.status ?? "draft";
  } catch (fetchErr) {
    const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    await ctx.db.query(
      `UPDATE apparel_orders
       SET printful_status = 'failed', error_message = $2, updated_at = now()
       WHERE payment_intent_id = $1`,
      [payment_intent_id, errMsg]
    );
    return { status: 502, body: `Failed to reach Printful API: ${errMsg}` };
  }

  // Persist the Printful order ID and status.
  await ctx.db.query(
    `UPDATE apparel_orders
     SET printful_order_id = $2, printful_status = $3, updated_at = now()
     WHERE payment_intent_id = $1`,
    [payment_intent_id, printfulOrderId, printfulStatus]
  );

  return {
    status: 200,
    body: {
      payment_intent_id,
      printful_order_id: printfulOrderId,
      printful_status: printfulStatus,
    },
  };
}
