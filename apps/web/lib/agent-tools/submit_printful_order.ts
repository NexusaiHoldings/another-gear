/**
 * Agent tool handler: submit_printful_order
 *
 * Mutation-class tool — creates a Printful fulfillment order via the Printful
 * REST API from a confirmed Stripe payment's line items and shipping address,
 * then persists the Printful order ID and initial status to apparel_orders.
 * Called automatically after payment_intent.succeeded is verified.
 */

import type { HandlerContext, HandlerResult } from "@nexus/identity-and-access";

type Args = Record<string, unknown>;

interface PrintfulLineItem {
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
  args: Args
): Promise<HandlerResult> {
  const paymentIntentId = args.payment_intent_id as string | undefined;
  const lineItems = args.line_items as PrintfulLineItem[] | undefined;
  const shippingAddress = args.shipping_address as ShippingAddress | undefined;
  const externalOrderId = args.order_id as string | undefined;

  if (!paymentIntentId || typeof paymentIntentId !== "string") {
    return { status: 400, body: "Missing required argument: payment_intent_id" };
  }
  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
    return { status: 400, body: "Missing or empty required argument: line_items" };
  }
  if (!shippingAddress || typeof shippingAddress !== "object") {
    return { status: 400, body: "Missing required argument: shipping_address" };
  }

  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    return { status: 500, body: "PRINTFUL_API_KEY is not configured" };
  }

  const printfulPayload = {
    external_id: externalOrderId ?? paymentIntentId,
    shipping: "STANDARD",
    recipient: {
      name: shippingAddress.name,
      address1: shippingAddress.address1,
      address2: shippingAddress.address2 ?? "",
      city: shippingAddress.city,
      state_code: shippingAddress.state_code,
      country_code: shippingAddress.country_code,
      zip: shippingAddress.zip,
      phone: shippingAddress.phone ?? "",
      email: shippingAddress.email ?? "",
    },
    items: lineItems.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      name: item.name ?? `Variant ${item.variant_id}`,
    })),
  };

  let printfulOrderId: number;
  let printfulStatus: string;

  try {
    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(printfulPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        JSON.stringify({
          event: "printful_order_create_failed",
          payment_intent_id: paymentIntentId,
          http_status: response.status,
          error: errorText,
        })
      );
      return {
        status: 502,
        body: `Printful API error (${response.status}): ${errorText}`,
      };
    }

    const data = (await response.json()) as PrintfulOrderResponse;
    printfulOrderId = data.result.id;
    printfulStatus = data.result.status;
  } catch (fetchError) {
    const message =
      fetchError instanceof Error ? fetchError.message : String(fetchError);
    console.error(
      JSON.stringify({
        event: "printful_order_fetch_error",
        payment_intent_id: paymentIntentId,
        error: message,
      })
    );
    return { status: 502, body: `Failed to contact Printful API: ${message}` };
  }

  try {
    await ctx.db.execute(
      `INSERT INTO apparel_orders
         (payment_intent_id, printful_order_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (payment_intent_id)
       DO UPDATE SET
         printful_order_id = EXCLUDED.printful_order_id,
         status            = EXCLUDED.status,
         updated_at        = NOW()`,
      paymentIntentId,
      String(printfulOrderId),
      printfulStatus
    );
  } catch (dbError) {
    const message =
      dbError instanceof Error ? dbError.message : String(dbError);
    console.error(
      JSON.stringify({
        event: "apparel_orders_upsert_failed",
        payment_intent_id: paymentIntentId,
        printful_order_id: printfulOrderId,
        error: message,
      })
    );
    return { status: 500, body: `Database error persisting order: ${message}` };
  }

  console.log(
    JSON.stringify({
      event: "printful_order_submitted",
      payment_intent_id: paymentIntentId,
      printful_order_id: printfulOrderId,
      status: printfulStatus,
    })
  );

  return {
    status: 200,
    body: {
      printful_order_id: printfulOrderId,
      status: printfulStatus,
      payment_intent_id: paymentIntentId,
    },
  };
}
