/**
 * POST /api/webhooks/printful — Printful fulfillment lifecycle events.
 *
 * Verifies the HMAC-SHA256 signature from X-Printful-Signature header,
 * then delegates to processPrintfulEvent for order/event persistence.
 */
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { buildDb } from "@/lib/db";
import { buildEventBus } from "@/lib/events";
import { processPrintfulEvent } from "@/lib/apparel/printful-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function verifySignature(rawBody: string, secret: string, signature: string): boolean {
  if (!signature) return false;
  const expectedHex = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (signature.length !== expectedHex.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHex));
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();

  const secret = process.env.PRINTFUL_WEBHOOK_SECRET;
  if (!secret) {
    console.error(JSON.stringify({ event: "printful_webhook_error", error: "PRINTFUL_WEBHOOK_SECRET not configured" }));
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-printful-signature") ?? "";
  if (!verifySignature(rawBody, secret, signature)) {
    console.warn(JSON.stringify({ event: "printful_webhook_invalid_signature", has_sig: signature.length > 0 }));
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const eventType = String(payload.type ?? "");
  if (!eventType) {
    return NextResponse.json({ error: "missing event type" }, { status: 400 });
  }

  const db = buildDb();
  const events = buildEventBus();

  try {
    await processPrintfulEvent(db, events, eventType, payload);
    console.log(JSON.stringify({ event: "printful_webhook_processed", type: eventType }));
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error(JSON.stringify({ event: "printful_webhook_processing_error", type: eventType, error: String(err) }));
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
