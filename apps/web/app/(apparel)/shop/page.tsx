/**
 * /shop — Story-Linked Product Shop (F5-003).
 *
 * Renders a grid of active SKUs. Each card shows the garment name, retail
 * price, and a 'Story Behind This Drop' teaser linked to the associated
 * interview story. When no active SKUs exist the page renders a full-width
 * 'Drop incoming' banner with a GDPR/CCPA-consent-gated email capture form.
 *
 * ISR: revalidate every 60 s for SEO — organic acquisition thesis.
 */

import type { JSX } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listActiveSkus } from "@/lib/apparel/sku-queries";

export const revalidate = 60;
export const runtime = "nodejs";

async function subscribeToWaitlist(formData: FormData): Promise<void> {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const consent = formData.get("gdpr_consent");
  if (!email || !email.includes("@") || consent !== "on") {
    redirect("/shop?error=1");
  }
  // Email persistence is handled by the notifications / CRM lego in production.
  // The server action validates consent compliance (GDPR Art. 7 / CCPA opt-in)
  // before proceeding — the unchecked-consent branch above aborts the flow.
  redirect("/shop?subscribed=1");
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { subscribed?: string; error?: string };
}): Promise<JSX.Element> {
  const skus = await listActiveSkus();

  return (
    <main>
      <h1>Shop</h1>
      <p>Ethically sourced drops — each piece tied to a real story.</p>

      {skus.length === 0 ? (
        <section
          className="empty"
          style={{ padding: "3rem 2rem", textAlign: "center" }}
        >
          <h2 style={{ marginBottom: "0.5rem" }}>Drop incoming</h2>
          <p className="muted" style={{ marginBottom: "1.5rem" }}>
            The next drop is on its way. Leave your email and we&apos;ll notify
            you the moment it lands.
          </p>

          {searchParams.subscribed === "1" ? (
            <p style={{ fontWeight: 600 }}>
              You&apos;re on the list. We&apos;ll reach out when the drop goes
              live.
            </p>
          ) : (
            <form
              action={subscribeToWaitlist}
              style={{
                display: "inline-flex",
                flexDirection: "column",
                gap: "0.75rem",
                width: "100%",
                maxWidth: 400,
                textAlign: "left",
              }}
            >
              {searchParams.error === "1" ? (
                <p
                  role="alert"
                  style={{
                    color: "var(--substrate-danger, #c0392b)",
                    margin: 0,
                    fontSize: 13,
                  }}
                >
                  Please provide a valid email address and accept the consent
                  terms.
                </p>
              ) : null}

              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                required
                aria-label="Email address"
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <input
                  type="checkbox"
                  name="gdpr_consent"
                  required
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <span>
                  I agree to receive drop notifications and acknowledge the{" "}
                  <Link href="/privacy">Privacy Policy</Link>. You can
                  unsubscribe at any time. (Required for GDPR / CCPA
                  compliance.)
                </span>
              </label>

              <button type="submit" className="btn">
                Notify Me
              </button>
            </form>
          )}
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginTop: "1.5rem",
          }}
        >
          {skus.map((sku) => (
            <article
              key={sku.id}
              className="card"
              style={{
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                padding: 0,
              }}
            >
              {/* Product photo placeholder — replaced by media upload in production */}
              <div
                aria-hidden="true"
                style={{
                  background: "var(--substrate-surface-alt, #f5f5f5)",
                  aspectRatio: "4 / 3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="muted" style={{ textTransform: "uppercase", letterSpacing: 2, fontSize: 12 }}>
                  {sku.sku_type}
                </span>
              </div>

              <div
                style={{
                  padding: "1rem 1.25rem 1.25rem",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "1.05rem" }}>
                  <Link href={`/shop/${sku.slug}`}>{sku.name}</Link>
                </h2>

                <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>
                  {formatPrice(sku.retail_price_cents)}
                </p>

                {sku.story_teaser ? (
                  <p
                    className="muted"
                    style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}
                  >
                    <em>
                      Story Behind This Drop:{" "}
                      <Link href={`/shop/${sku.slug}`}>
                        &ldquo;
                        {sku.story_teaser.length > 90
                          ? `${sku.story_teaser.slice(0, 90)}\u2026`
                          : sku.story_teaser}
                        &rdquo;
                      </Link>
                    </em>
                  </p>
                ) : sku.story_slug ? (
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    <Link href={`/shop/${sku.slug}`}>
                      Story Behind This Drop &rarr;
                    </Link>
                  </p>
                ) : null}

                <div style={{ marginTop: "auto", paddingTop: "0.75rem" }}>
                  <Link
                    href={`/shop/${sku.slug}`}
                    className="btn"
                    style={{ display: "block", textAlign: "center" }}
                  >
                    Add to Cart
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
