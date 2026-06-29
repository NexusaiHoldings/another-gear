/**
 * /admin/skus — Operator SKU catalog admin (apparel-admin-skus-001).
 *
 * Lists all apparel SKUs in a table with Active/Draft status pills.
 * FTC Textile Act compliance: fiber_content_label and country_of_origin are
 * visible columns; a SKU may not be set active unless both are non-empty.
 * All activation / deactivation events are written to admin_audit_log.
 *
 * Auth: admin role required — @nexus/identity-and-access session validated by
 * getAdminUser(); non-admins are redirected to /login.
 */

import type { CSSProperties, JSX } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { buildDb } from "@/lib/db";
import {
  canActivateSku,
  skuStatusLabel,
  type SkuRow,
} from "@/lib/apparel/admin-predicates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function fetchSkus(): Promise<SkuRow[]> {
  const db = buildDb();
  return db.query<SkuRow>(
    `SELECT id, name, slug, sku_type, retail_price_cents,
            fiber_content_label, country_of_origin, active, created_at
       FROM apparel_skus
      ORDER BY created_at DESC`,
  );
}

async function updateSku(formData: FormData): Promise<void> {
  "use server";
  const db = buildDb();
  const skuId = String(formData.get("id") ?? "").trim();
  if (!skuId) return;

  const name = String(formData.get("name") ?? "").trim();
  const fiberContentLabel = String(formData.get("fiber_content_label") ?? "").trim();
  const countryOfOrigin = String(formData.get("country_of_origin") ?? "").trim();
  const active = formData.get("active") === "true";

  // FTC Textile Act + business rule: cannot activate without both compliance fields
  if (active && !canActivateSku({ fiber_content_label: fiberContentLabel, country_of_origin: countryOfOrigin })) {
    return;
  }

  await db.execute(
    `UPDATE apparel_skus
        SET name               = $2,
            fiber_content_label = $3,
            country_of_origin  = $4,
            active             = $5
      WHERE id = $1::uuid`,
    skuId,
    name,
    fiberContentLabel,
    countryOfOrigin,
    active,
  );

  const admin = await getAdminUser();
  const adminId = admin?.id ?? "00000000-0000-0000-0000-000000000000";
  const action = active ? "sku.activated" : "sku.deactivated";
  await db.execute(
    `INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, payload)
     VALUES ($1::uuid, $2, 'sku', $3, $4::jsonb)`,
    adminId,
    action,
    skuId,
    JSON.stringify({ name, fiber_content_label: fiberContentLabel, country_of_origin: countryOfOrigin }),
  );

  revalidatePath("/admin/skus");
}

function pillStyle(active: boolean): CSSProperties {
  return active
    ? { background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999 }
    : { background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999 };
}

const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const td: CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
  color: "#0f172a",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
};

export default async function SkuAdminPage(): Promise<JSX.Element> {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?redirect=/admin/skus");

  const skus = await fetchSkus();

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>
          SKU Management
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
          Manage the product catalog. FTC Textile Act compliance requires fiber content label
          and country of origin before a SKU can be activated.
        </p>
        <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
          <a href="/admin/stories" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}>
            → Story Admin
          </a>
          <a href="/admin" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>
            ← Back to Admin
          </a>
        </div>
      </div>

      {skus.length === 0 ? (
        <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 32, textAlign: "center", color: "#64748b" }}>
          No SKUs yet. Add products in Printful and sync them here.
        </div>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name / Slug</th>
                <th style={th}>Type</th>
                <th style={th}>Price</th>
                <th style={th}>Status</th>
                <th style={th}>Fiber Content</th>
                <th style={th}>Country of Origin</th>
                <th style={{ ...th, textAlign: "right" }}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((sku) => (
                <tr key={sku.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{sku.name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sku.slug}</div>
                  </td>
                  <td style={{ ...td, textTransform: "capitalize" }}>{sku.sku_type}</td>
                  <td style={td}>${(sku.retail_price_cents / 100).toFixed(2)}</td>
                  <td style={td}>
                    <span style={pillStyle(sku.active)}>{skuStatusLabel(sku.active)}</span>
                  </td>
                  <td style={{ ...td, color: sku.fiber_content_label ? "#0f172a" : "#94a3b8" }}>
                    {sku.fiber_content_label || "—"}
                  </td>
                  <td style={{ ...td, color: sku.country_of_origin ? "#0f172a" : "#94a3b8" }}>
                    {sku.country_of_origin || "—"}
                  </td>
                  <td style={{ ...td, textAlign: "right", minWidth: 220 }}>
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 13, color: "#2563eb" }}>
                        Edit
                      </summary>
                      <form action={updateSku} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        <input type="hidden" name="id" value={sku.id} />
                        <div>
                          <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>
                            Name
                          </label>
                          <input
                            name="name"
                            defaultValue={sku.name}
                            required
                            style={{ width: "100%", padding: "4px 8px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>
                            Fiber Content Label
                          </label>
                          <input
                            name="fiber_content_label"
                            defaultValue={sku.fiber_content_label}
                            style={{ width: "100%", padding: "4px 8px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>
                            Country of Origin
                          </label>
                          <input
                            name="country_of_origin"
                            defaultValue={sku.country_of_origin}
                            style={{ width: "100%", padding: "4px 8px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>
                            Status
                          </label>
                          <div style={{ display: "flex", gap: 8 }}>
                            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                              <input type="radio" name="active" value="true" defaultChecked={sku.active} />
                              Active
                            </label>
                            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                              <input type="radio" name="active" value="false" defaultChecked={!sku.active} />
                              Draft
                            </label>
                          </div>
                          {!canActivateSku(sku) && (
                            <p style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>
                              Fiber content and country of origin required to activate.
                            </p>
                          )}
                        </div>
                        <button
                          type="submit"
                          style={{ alignSelf: "flex-start", padding: "5px 14px", fontSize: 13, borderRadius: 7, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", cursor: "pointer" }}
                        >
                          Save
                        </button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
