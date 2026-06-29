/**
 * /shop/[slug] — Story-Linked Product Detail (F5-003).
 *
 * Renders the full product + story page:
 *   • YouTube / TikTok video embed at top
 *   • Subject pull-quote in large display type
 *   • Garment details: size selector (mapped to Printful variant IDs) + Add to Cart
 *   • FTC disclosure banner when apparel_stories.ftc_compensated = true
 *
 * Checkout delegates to @nexus/billing-and-subscriptions one-time payment flow
 * via a plain HTML POST to /api/billing/checkout.
 *
 * ISR: revalidate every 60 s — SSG-level performance for organic SEO.
 */

import type { JSX } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSkuWithStory,
  listAllSkuSlugs,
  normalizeVariants,
  getVideoEmbedUrl,
} from "@/lib/apparel/sku-queries";

export const revalidate = 60;
export const runtime = "nodejs";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await listAllSkuSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const sku = await getSkuWithStory(params.slug);
  if (!sku) return { title: "Product not found" };

  const title = sku.subject_first_name
    ? `${sku.name} — ${sku.subject_first_name}'s Story`
    : sku.name;
  const description =
    sku.subject_pull_quote ??
    `Shop ${sku.name} — a story-linked apparel drop.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "2XL"];

export default async function ShopDetailPage({
  params,
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const sku = await getSkuWithStory(params.slug);
  if (!sku) notFound();

  const variants = normalizeVariants(sku.printful_variant_ids);
  const embedUrl = getVideoEmbedUrl(sku.video_embed_url);
  const storyPublished =
    !!sku.story_id &&
    !!sku.published_at &&
    new Date(sku.published_at) <= new Date();

  return (
    <main>
      <p>
        <Link href="/shop">&larr; Back to Shop</Link>
      </p>

      {/* FTC disclosure — must appear above the fold when compensated */}
      {sku.ftc_compensated && (
        <div
          role="note"
          style={{
            background: "var(--substrate-surface-alt, #fffbea)",
            border: "1px solid var(--substrate-border, #d4b700)",
            borderRadius: 6,
            padding: "0.6rem 1rem",
            marginBottom: "1.25rem",
            fontSize: 13,
          }}
        >
          <strong>FTC Disclosure:</strong> The subject of this story received
          compensation or complimentary product in connection with this drop.
        </div>
      )}

      {/* Video embed — YouTube or TikTok */}
      {storyPublished && embedUrl ? (
        <div
          style={{
            position: "relative",
            marginBottom: "1.75rem",
            borderRadius: 10,
            overflow: "hidden",
            aspectRatio: "16 / 9",
          }}
        >
          <iframe
            src={embedUrl}
            title={
              sku.subject_first_name
                ? `${sku.subject_first_name}'s story`
                : "Story video"
            }
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        </div>
      ) : null}

      {/* Subject pull-quote — large display type */}
      {storyPublished && sku.subject_pull_quote ? (
        <blockquote
          style={{
            fontSize: "clamp(1.25rem, 3vw, 2rem)",
            fontStyle: "italic",
            lineHeight: 1.4,
            margin: "0 0 2rem",
            paddingLeft: "1.25rem",
            borderLeft: "4px solid var(--substrate-accent, #111)",
          }}
        >
          &ldquo;{sku.subject_pull_quote}&rdquo;
          {sku.subject_first_name ? (
            <footer
              style={{
                fontSize: "0.5em",
                fontStyle: "normal",
                marginTop: "0.6rem",
                opacity: 0.65,
              }}
            >
              &mdash; {sku.subject_first_name}
            </footer>
          ) : null}
        </blockquote>
      ) : null}

      {/* Garment detail card */}
      <div
        className="card"
        style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-start" }}
      >
        {/* Product image placeholder */}
        <div style={{ flex: "1 1 280px" }}>
          <div
            aria-hidden="true"
            style={{
              background: "var(--substrate-surface-alt, #f5f5f5)",
              aspectRatio: "4 / 3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
            }}
          >
            <span
              className="muted"
              style={{
                textTransform: "uppercase",
                letterSpacing: 2,
                fontSize: 12,
              }}
            >
              {sku.sku_type}
            </span>
          </div>
        </div>

        {/* Purchase panel */}
        <div style={{ flex: "1 1 280px" }}>
          <h1 style={{ marginTop: 0 }}>{sku.name}</h1>
          <p
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: "0.25rem 0 1.25rem",
            }}
          >
            {formatPrice(sku.retail_price_cents)}
          </p>

          {/* Size selector + checkout — delegates to billing lego */}
          <form method="POST" action="/api/billing/checkout">
            <input type="hidden" name="tier_name" value={`apparel_${sku.slug}`} />
            <input
              type="hidden"
              name="success_url"
              value={`/shop/${sku.slug}?success=1`}
            />
            <input
              type="hidden"
              name="cancel_url"
              value={`/shop/${sku.slug}`}
            />
            {sku.printful_product_id ? (
              <input
                type="hidden"
                name="printful_product_id"
                value={sku.printful_product_id}
              />
            ) : null}

            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="variant-select"
                style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500 }}
              >
                Size
              </label>
              <select
                id="variant-select"
                name="variant_id"
                required
                style={{ width: "100%" }}
              >
                {variants.length > 0
                  ? variants.map((v) => (
                      <option key={v.variant_id} value={v.variant_id}>
                        {v.size}
                      </option>
                    ))
                  : DEFAULT_SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Add to Cart &mdash; {formatPrice(sku.retail_price_cents)}
            </button>
          </form>

          {/* Garment metadata */}
          <dl style={{ marginTop: "1.5rem", fontSize: 13 }}>
            <dt style={{ fontWeight: 600, marginBottom: 2 }}>Material</dt>
            <dd
              className="muted"
              style={{ margin: "0 0 0.75rem" }}
            >
              {sku.fiber_content_label}
            </dd>
            <dt style={{ fontWeight: 600, marginBottom: 2 }}>Made in</dt>
            <dd className="muted" style={{ margin: 0 }}>
              {sku.country_of_origin}
            </dd>
          </dl>
        </div>
      </div>

      {/* Full story body */}
      {storyPublished && sku.body_markdown ? (
        <section style={{ marginTop: "2.5rem" }}>
          <h2>The Full Story</h2>
          <div
            className="muted"
            style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, maxWidth: 680 }}
          >
            {sku.body_markdown}
          </div>
        </section>
      ) : null}
    </main>
  );
}
