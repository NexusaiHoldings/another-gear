import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStoryBySlug } from "@/lib/apparel/story-queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function markdownToHtml(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (trimmed.startsWith("### ")) {
        return `<h4>${applyInline(trimmed.slice(4))}</h4>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h3>${applyInline(trimmed.slice(3))}</h3>`;
      }
      if (trimmed.startsWith("# ")) {
        return `<h2>${applyInline(trimmed.slice(2))}</h2>`;
      }
      return `<p>${applyInline(trimmed.replace(/\n/g, " "))}</p>`;
    })
    .join("\n");
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const story = await getStoryBySlug(params.slug);
  if (!story) return { title: "Story not found" };

  const title = `${story.subject_first_name}'s Story`;
  const description =
    story.subject_pull_quote ??
    `Read ${story.subject_first_name}'s interview and shop the associated drop.`;

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: story.published_at,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const story = await getStoryBySlug(params.slug);
  if (!story) notFound();

  const bodyHtml = story.body_markdown ? markdownToHtml(story.body_markdown) : null;

  return (
    <main>
      <p>
        <Link href="/stories">← All Stories</Link>
      </p>

      <section>
        <h1>{story.subject_first_name}</h1>
        {story.subject_pull_quote && (
          <blockquote>
            <p>
              <em>&ldquo;{story.subject_pull_quote}&rdquo;</em>
            </p>
          </blockquote>
        )}
      </section>

      {story.ftc_compensated && (
        <p className="muted">
          <small>
            <strong>Disclosure:</strong> This individual received gifted product or compensation in
            exchange for their participation in this interview. Per FTC guidelines, this constitutes
            a paid partnership.
          </small>
        </p>
      )}

      {story.video_embed_url && (
        <section>
          <div
            style={{
              position: "relative",
              paddingTop: "56.25%",
              overflow: "hidden",
              borderRadius: "8px",
            }}
          >
            <iframe
              src={story.video_embed_url}
              title={`${story.subject_first_name}'s interview`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          </div>
        </section>
      )}

      {bodyHtml && (
        <article dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      )}

      {story.skus.length > 0 && (
        <section>
          <h2>Shop This Drop</h2>
          <div>
            {story.skus.map((sku) => (
              <article key={sku.slug} className="card">
                <h3>{sku.name}</h3>
                <p className="muted">
                  {sku.sku_type} &middot; {formatPrice(sku.retail_price_cents)}
                </p>
                <p>
                  <Link href={`/shop/${sku.slug}`} className="btn">
                    Shop Now
                  </Link>
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
