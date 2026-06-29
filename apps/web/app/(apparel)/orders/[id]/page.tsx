/**
 * /orders/[id] — Customer order status page.
 *
 * Shows a progress stepper (Processing → Fulfilled → Shipped → Delivered),
 * a status timeline of fulfillment events as card rows, tracking link, and
 * estimated delivery. New customers with no orders see an empty state.
 */
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { getSessionUser } from "@/lib/admin-auth";
import { buildDb } from "@/lib/db";

interface Order {
  id: string;
  printful_order_id: string;
  customer_email: string;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  estimated_delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderEvent {
  id: string;
  event_type: string;
  customer_status: string;
  printful_status: string | null;
  occurred_at: string;
}

const STATUS_STEPS = ["Processing", "Fulfilled", "Shipped", "Delivered"] as const;
type StatusStep = (typeof STATUS_STEPS)[number];

function statusPillStyle(status: string): CSSProperties {
  const palette: Record<string, CSSProperties> = {
    Processing: { background: "#fef3c7", color: "#92400e" },
    Fulfilled:  { background: "#e0e7ff", color: "#3730a3" },
    Shipped:    { background: "#dbeafe", color: "#1d4ed8" },
    Delivered:  { background: "#d1fae5", color: "#065f46" },
    Canceled:   { background: "#fee2e2", color: "#991b1b" },
  };
  return {
    display: "inline-block",
    padding: "0.15rem 0.6rem",
    borderRadius: "9999px",
    fontSize: "0.8rem",
    fontWeight: 600,
    ...(palette[status] ?? palette.Processing),
  };
}

function eventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    order_created:      "Order placed",
    order_fulfilled:    "Fulfilled by manufacturer",
    shipment_sent:      "Shipped",
    package_shipped:    "Shipped",
    package_delivered:  "Delivered",
    shipment_delivered: "Delivered",
    order_canceled:     "Order canceled",
    order_failed:       "Order failed",
  };
  return labels[eventType] ?? eventType.replace(/_/g, " ");
}

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return ts;
  }
}

async function getOrder(orderId: string, userEmail: string): Promise<Order | null> {
  const db = buildDb();
  try {
    const rows = await db.query<Order>(
      `SELECT id, printful_order_id, customer_email, status, tracking_number,
              tracking_url, estimated_delivery_date, created_at, updated_at
       FROM apparel_orders
       WHERE id = $1::uuid AND customer_email = $2`,
      orderId,
      userEmail,
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function getOrderEvents(orderId: string): Promise<OrderEvent[]> {
  const db = buildDb();
  try {
    return db.query<OrderEvent>(
      `SELECT id, event_type, customer_status, printful_status, occurred_at
       FROM apparel_order_events
       WHERE order_id = $1::uuid
       ORDER BY occurred_at ASC`,
      orderId,
    );
  } catch {
    return [];
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const order = await getOrder(params.id, user.email);

  if (!order) {
    return (
      <main>
        <h1>My Orders</h1>
        <p>Track the status of your apparel orders from placement to delivery.</p>
        <div className="empty">
          <h2>Your first order will appear here</h2>
          <p>Once you place an order, you can follow its journey — from production to your door — right on this page.</p>
          <a href="/shop" className="btn">
            Shop Now
          </a>
        </div>
      </main>
    );
  }

  const orderEvents = await getOrderEvents(order.id);
  const isCanceled = order.status === "Canceled";
  const currentStepIndex = isCanceled
    ? -1
    : STATUS_STEPS.indexOf(order.status as StatusStep);

  const stepperStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.25rem",
    padding: "1rem",
  };

  return (
    <main>
      <h1>Order #{order.printful_order_id}</h1>
      <p>
        Placed on {formatDate(order.created_at)}&ensp;&middot;&ensp;
        <span style={statusPillStyle(order.status)}>{order.status}</span>
      </p>

      {!isCanceled && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={stepperStyle}>
            {STATUS_STEPS.map((step, idx) => {
              const done = idx <= currentStepIndex;
              const active = idx === currentStepIndex;
              return (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "1.75rem",
                      height: "1.75rem",
                      borderRadius: "50%",
                      background: done ? "#2563eb" : "#e5e7eb",
                      color: done ? "#fff" : "#6b7280",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    style={{
                      fontWeight: active ? 700 : 400,
                      color: done ? "#111" : "#9ca3af",
                      fontSize: "0.875rem",
                    }}
                  >
                    {step}
                  </span>
                  {idx < STATUS_STEPS.length - 1 && (
                    <span style={{ color: "#d1d5db", margin: "0 0.2rem", fontSize: "1rem" }}>›</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(order.tracking_number || order.tracking_url) && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <strong>Shipping &amp; Tracking</strong>
          {order.tracking_url ? (
            <p>
              <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                {order.tracking_number ? `Track #${order.tracking_number}` : "Track your package"}
              </a>
            </p>
          ) : (
            <p>
              Tracking #{order.tracking_number}
            </p>
          )}
          {order.estimated_delivery_date && (
            <p>
              <span className="muted">Estimated delivery: </span>
              <strong>{formatDate(order.estimated_delivery_date)}</strong>
            </p>
          )}
        </div>
      )}

      <h2>Order Timeline</h2>

      {orderEvents.length === 0 ? (
        <p className="muted">No fulfillment events recorded yet. Check back soon.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {orderEvents.map((ev) => (
            <li key={ev.id} className="card" style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div>
                  <strong>{eventLabel(ev.event_type)}</strong>
                  <p className="muted" style={{ margin: "0.2rem 0 0" }}>
                    <span style={statusPillStyle(ev.customer_status)}>{ev.customer_status}</span>
                    {ev.printful_status && ev.printful_status !== ev.event_type && (
                      <span style={{ marginLeft: "0.5rem" }}>({ev.printful_status})</span>
                    )}
                  </p>
                </div>
                <span className="muted" style={{ fontSize: "0.8rem", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {formatDate(ev.occurred_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
