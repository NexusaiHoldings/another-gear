/**
 * submit_printful_order — confirm-gated mutation tool handler (F3-DT001).
 *
 * Creates a Printful fulfillment order via the Printful REST API using the
 * confirmed Stripe payment's line items and shipping address, then writes
 * the Printful order ID and initial status to apparel_orders.
 *
 * Called automatically after payment_intent.succeeded webhook is verified.
 */

import type { HandlerContext, HandlerResult } from "@nexus/identity-and-access";

type Args = Record<string, unknown>;

interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

interface LineItem {
  sync_variant_id?: number;
  external_variant_id?: string;
  quantity: number;
  retail_price?: string;
  name?: string;
}

interface PrintfulOrderItem {
  sync_variant_id?: number;
  external_variant_id?: string;
  quantity: number;
  retail_price?: string;
  name?: string;
}

interface PrintfulOrderPayload {
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
    email?: string;
    phone?: string;
  };
  items: PrintfulOrderItem[];
  retail_costs?: {
    currency: string;
    subtotal?: string;
    shipping?: string;
    tax?: string;
    total?: string;
  };
  external_id?: string;
}

interface PrintfulApiResponse {
  code: number;
  result?: {
    id: number;
    status: string;
    [key: string]: unknown;
  };
  error?: {
    reason: string;
    message: string;
  };
}

async function callPrintfulApi(payload: PrintfulOrderPayload): Promise<PrintfulApiResponse> {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    throw new Error("PRINTFUL_API_KEY environment variable is not configured");
  }

  const response = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID ?? "",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as PrintfulApiResponse;

  if (!response.ok) {
    throw new Error(
      `Printful API error ${response.status}: ${data.error?.message ?? "Unknown error"}`
    );
  }

  return data;
}

export async function handleSubmitPrintfulOrder(
  ctx: HandlerContext,
  args: Args
): Promise<HandlerResult> {
  const paymentIntentId = args.payment_intent_id as string | undefined;
  const shippingAddress = args.shipping_address as ShippingAddress | undefined;
  const lineItems = args.line_items as LineItem[] | undefined;
  const externalOrderId = args.external_order_id as string | undefined;

  if (!paymentIntentId) {
    return { status: 400, body: "Missing required argument: payment_intent_id" };
  }

  if (!shippingAddress) {
    return { status: 400, body: "Missing required argument: shipping_address" };
  }

  if (!lineItems || lineItems.length === 0) {
    return { status: 400, body: "Missing required argument: line_items (must be non-empty)" };
  }

  if (!shippingAddress.name || !shippingAddress.address1 || !shippingAddress.city ||
      !shippingAddress.state_code || !shippingAddress.country_code || !shippingAddress.zip) {
    return { status: 400, body: "shipping_address is missing required fields (name, address1, city, state_code, country_code, zip)" };
  }

  const printfulItems: PrintfulOrderItem[] = lineItems.map((item) => {
    const orderItem: PrintfulOrderItem = { quantity: item.quantity };
    if (item.sync_variant_id) orderItem.sync_variant_id = item.sync_variant_id;
    if (item.external_variant_id) orderItem.external_variant_id = item.external_variant_id;
    if (item.retail_price) orderItem.retail_price = item.retail_price;
    if (item.name) orderItem.name = item.name;
    return orderItem;
  });

  const payload: PrintfulOrderPayload = {
    recipient: {
      name: shippingAddress.name,
      address1: shippingAddress.address1,
      city: shippingAddress.city,
      state_code: shippingAddress.state_code,
      country_code: shippingAddress.country_code,
      zip: shippingAddress.zip,
    },
    items: printfulItems,
    external_id: externalOrderId ?? paymentIntentId,
  };

  if (shippingAddress.address2) payload.recipient.address2 = shippingAddress.address2;
  if (shippingAddress.email) payload.recipient.email = shippingAddress.email;
  if (shippingAddress.phone) payload.recipient.phone = shippingAddress.phone;

  let printfulResponse: PrintfulApiResponse;
  try {
    printfulResponse = await callPrintfulApi(payload);
  } catch (apiError) {
    const message = apiError instanceof Error ? apiError.message : String(apiError);
    return { status: 502, body: `Printful API call failed: ${message}` };
  }

  if (!printfulResponse.result?.id) {
    return { status: 502, body: "Printful API returned no order ID in response" };
  }

  const printfulOrderId = String(printfulResponse.result.id);
  const initialStatus = printfulResponse.result.status ?? "pending";

  try {
    await ctx.db.query(
      `INSERT INTO apparel_orders (
        payment_intent_id,
        printful_order_id,
        status,
        recipient_name,
        recipient_email,
        shipping_address,
        line_items,
        printful_response
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        paymentIntentId,
        printfulOrderId,
        initialStatus,
        shippingAddress.name,
        shippingAddress.email ?? null,
        JSON.stringify(shippingAddress),
        JSON.stringify(lineItems),
        JSON.stringify(printfulResponse),
      ]
    );
  } catch (dbError) {
    const message = dbError instanceof Error ? dbError.message : String(dbError);
    return {
      status: 500,
      body: `Order created in Printful (id: ${printfulOrderId}) but failed to persist to database: ${message}`,
    };
  }

  return {
    status: 200,
    body: {
      printful_order_id: printfulOrderId,
      status: initialStatus,
      payment_intent_id: paymentIntentId,
      message: `Printful order ${printfulOrderId} created successfully with status: ${initialStatus}`,
    },
  };
}
