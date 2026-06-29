/**
 * Printful fulfillment sync — maps events to DB rows and triggers email.
 */
import type { Db } from "@nexus/identity-and-access/api/_lib/db";
import type { EventBus } from "@nexus/identity-and-access/api/_lib/events";

export type CustomerStatus = "Processing" | "Fulfilled" | "Shipped" | "Delivered" | "Canceled";

interface PrintfulRecipient {
  email?: string;
  name?: string;
}

interface PrintfulOrder {
  id: number | string;
  external_id?: string;
  status?: string;
  recipient?: PrintfulRecipient;
}

interface PrintfulShipment {
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery_date?: string;
}

export function mapEventToCustomerStatus(eventType: string): CustomerStatus {
  const mapping: Record<string, CustomerStatus> = {
    order_created: "Processing",
    order_fulfilled: "Fulfilled",
    shipment_sent: "Shipped",
    package_shipped: "Shipped",
    package_delivered: "Delivered",
    shipment_delivered: "Delivered",
    order_canceled: "Canceled",
    order_failed: "Canceled",
  };
  return mapping[eventType] ?? "Processing";
}

function extractEventData(payload: Record<string, unknown>): {
  order: PrintfulOrder | null;
  shipment: PrintfulShipment | null;
} {
  const data = (payload.data ?? payload) as Record<string, unknown>;
  return {
    order: (data.order as PrintfulOrder) ?? null,
    shipment: (data.shipment as PrintfulShipment) ?? null,
  };
}

async function upsertOrder(
  db: Db,
  printfulOrderId: string,
  customerEmail: string,
  status: CustomerStatus,
  trackingNumber: string | null,
  trackingUrl: string | null,
  estimatedDelivery: string | null,
  rawPayload: Record<string, unknown>,
): Promise<string> {
  const existing = await db.query<{ id: string }>(
    "SELECT id FROM apparel_orders WHERE printful_order_id = $1",
    printfulOrderId,
  );

  if (existing.length > 0) {
    const orderId = existing[0].id;
    await db.execute(
      `UPDATE apparel_orders SET
         status = $2,
         tracking_number = COALESCE($3, tracking_number),
         tracking_url = COALESCE($4, tracking_url),
         estimated_delivery_date = COALESCE($5::date, estimated_delivery_date),
         raw_payload = $6::jsonb,
         updated_at = timezone('utc', now())
       WHERE id = $1::uuid`,
      orderId,
      status,
      trackingNumber,
      trackingUrl,
      estimatedDelivery,
      JSON.stringify(rawPayload),
    );
    return orderId;
  }

  const rows = await db.query<{ id: string }>(
    `INSERT INTO apparel_orders
       (printful_order_id, customer_email, status, tracking_number, tracking_url,
        estimated_delivery_date, raw_payload)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7::jsonb)
     RETURNING id`,
    printfulOrderId,
    customerEmail,
    status,
    trackingNumber,
    trackingUrl,
    estimatedDelivery,
    JSON.stringify(rawPayload),
  );
  return rows[0].id;
}

async function insertOrderEvent(
  db: Db,
  orderId: string,
  eventType: string,
  printfulStatus: string | null,
  customerStatus: CustomerStatus,
  rawPayload: Record<string, unknown>,
): Promise<void> {
  await db.execute(
    `INSERT INTO apparel_order_events
       (order_id, event_type, printful_status, customer_status, raw_payload, occurred_at)
     VALUES ($1::uuid, $2, $3, $4, $5::jsonb, timezone('utc', now()))`,
    orderId,
    eventType,
    printfulStatus,
    customerStatus,
    JSON.stringify(rawPayload),
  );
}

function companyName(): string {
  return process.env.COMPANY_NAME ?? "Our Store";
}

function fromAddress(): string {
  const explicit = process.env.EMAIL_FROM;
  if (explicit) return explicit;
  const slug = process.env.COMPANY_SLUG ?? "no-reply";
  return `${slug}@nexusaiholdings.com`;
}

async function sendShipmentEmail(
  customerEmail: string,
  trackingNumber: string | null,
  trackingUrl: string | null,
  estimatedDelivery: string | null,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(JSON.stringify({ event: "printful_shipment_email_skip", reason: "RESEND_API_KEY not set" }));
    return;
  }

  const name = companyName();
  const trackingLabel = trackingNumber ? `Tracking #${trackingNumber}` : "Track your package";
  const trackingLink = trackingUrl
    ? `<a href="${trackingUrl}" style="color:#2563eb">${trackingLabel}</a>`
    : `<span>${trackingLabel}</span>`;
  const deliveryLine = estimatedDelivery
    ? `<p>Estimated delivery: <strong>${estimatedDelivery}</strong></p>`
    : "";

  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#111">` +
    `<h2>Your order has shipped!</h2>` +
    `<p>Great news — your ${name} order is on its way.</p>` +
    `<p>${trackingLink}</p>` +
    deliveryLine +
    `<p style="color:#888;font-size:13px">Questions? Reply to this email and we'll help.</p>` +
    `</div>`;

  const text =
    `Your ${name} order has shipped!\n\n` +
    `${trackingLabel}${trackingUrl ? `\n${trackingUrl}` : ""}` +
    `${estimatedDelivery ? `\nEstimated delivery: ${estimatedDelivery}` : ""}`;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${name} <${fromAddress()}>`,
        to: [customerEmail],
        subject: `Your ${name} order has shipped`,
        html,
        text,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error(JSON.stringify({ event: "printful_shipment_email_error", status: resp.status, detail: detail.slice(0, 200) }));
    } else {
      console.log(JSON.stringify({ event: "printful_shipment_email_sent", to: customerEmail }));
    }
  } catch (err) {
    console.error(JSON.stringify({ event: "printful_shipment_email_exception", error: String(err) }));
  }
}

const HANDLED_EVENTS = new Set([
  "order_created",
  "order_fulfilled",
  "shipment_sent",
  "order_canceled",
  "package_shipped",
  "package_delivered",
  "shipment_delivered",
  "order_failed",
]);

export async function processPrintfulEvent(
  db: Db,
  events: EventBus,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!HANDLED_EVENTS.has(eventType)) {
    console.log(JSON.stringify({ event: "printful_event_ignored", type: eventType }));
    return;
  }

  const { order, shipment } = extractEventData(payload);

  if (!order) {
    console.warn(JSON.stringify({ event: "printful_event_no_order_data", type: eventType }));
    return;
  }

  const printfulOrderId = String(order.id);
  const customerEmail = order.recipient?.email ?? "";
  const printfulStatus = String(order.status ?? eventType);
  const customerStatus = mapEventToCustomerStatus(eventType);

  if (!customerEmail) {
    console.warn(JSON.stringify({ event: "printful_event_no_email", type: eventType, printful_order_id: printfulOrderId }));
    return;
  }

  const trackingNumber = shipment?.tracking_number ?? null;
  const trackingUrl = shipment?.tracking_url ?? null;
  const estimatedDelivery = shipment?.estimated_delivery_date ?? null;

  const orderId = await upsertOrder(
    db,
    printfulOrderId,
    customerEmail,
    customerStatus,
    trackingNumber,
    trackingUrl,
    estimatedDelivery,
    payload,
  );

  await insertOrderEvent(db, orderId, eventType, printfulStatus, customerStatus, payload);

  await events.publish("apparel.order_event", {
    order_id: orderId,
    printful_order_id: printfulOrderId,
    event_type: eventType,
    customer_status: customerStatus,
    customer_email: customerEmail,
  });

  if (eventType === "shipment_sent" || eventType === "package_shipped") {
    await sendShipmentEmail(customerEmail, trackingNumber, trackingUrl, estimatedDelivery);
  }
}
