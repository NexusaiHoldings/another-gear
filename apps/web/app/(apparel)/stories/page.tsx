import Link from "next/link";
import { listPublishedStories } from "@/lib/apparel/story-queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function StoriesPage(): Promise<JSX.Element> {
  const stories = await listPublishedStories();
  const instagramUrl = process.env.INSTAGRAM_URL ?? "https://instagram.com";
  const tiktokUrl = process.env.TIKTOK_URL ?? "https://tiktok.com";

  return (
    <main>
      <h1>Stories</h1>
      <p>Real people. Real style. Hear from the community that wears the brand.</p>

      {stories.length === 0 ? (
        <div className="empty">
          <h2>The first story is being filmed.</h2>
          <p>Follow us for the drop.</p>
          <p>
            <a
              className="btn secondary"
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>{" "}
            <a
              className="btn secondary"
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              TikTok
            </a>
          </p>
        </div>
      ) : (
        <div>
          {stories.map((story) => (
            <article key={story.slug} className="card">
              <h2>{story.subject_first_name}</h2>
              {story.subject_pull_quote && (
                <p>
                  <em>&ldquo;{story.subject_pull_quote}&rdquo;</em>
                </p>
              )}
              <p className="muted">{formatDate(story.published_at)}</p>
              {story.ftc_compensated && (
                <p className="muted">
                  <small>Paid partnership / gifted</small>
                </p>
              )}
              <p>
                <Link href={`/stories/${story.slug}`} className="btn">
                  Read Story
                </Link>
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
