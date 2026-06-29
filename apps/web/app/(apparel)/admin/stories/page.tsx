/**
 * /admin/stories — Operator story content admin (apparel-admin-stories-001).
 *
 * Lists all interview stories with a consent_status badge (Pending / Signed /
 * Revoked) joined from the linked apparel_consent_records → apparel_interview_subjects
 * row.  The Publish toggle is disabled until consent_status = 'signed' — enforced
 * at the server-action level before any DB write.  All publish and unpublish
 * events are written to admin_audit_log with the acting admin's user ID.
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
  canPublishStory,
  consentBadgeLabel,
  type StoryRow,
} from "@/lib/apparel/admin-predicates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function fetchStories(): Promise<StoryRow[]> {
  const db = buildDb();
  return db.query<StoryRow>(
    `SELECT
       s.id,
       s.slug,
       s.subject_first_name,
       s.subject_pull_quote,
       s.video_embed_url,
       s.published_at,
       s.consent_record_id,
       s.ftc_compensated,
       s.created_at,
       sub.consent_status
     FROM apparel_stories s
     LEFT JOIN apparel_consent_records cr  ON cr.id      = s.consent_record_id
     LEFT JOIN apparel_interview_subjects sub ON sub.id  = cr.subject_id
     ORDER BY s.created_at DESC`,
  );
}

async function togglePublish(formData: FormData): Promise<void> {
  "use server";
  const db = buildDb();
  const storyId = String(formData.get("id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  if (!storyId || (action !== "publish" && action !== "unpublish")) return;

  if (action === "publish") {
    // Re-fetch consent status server-side — never trust a hidden field for authorization
    const rows = await db.query<{ consent_status: string | null }>(
      `SELECT sub.consent_status
         FROM apparel_stories s
         LEFT JOIN apparel_consent_records cr  ON cr.id      = s.consent_record_id
         LEFT JOIN apparel_interview_subjects sub ON sub.id  = cr.subject_id
        WHERE s.id = $1::uuid
        LIMIT 1`,
      storyId,
    );
    const consentStatus = rows[0]?.consent_status ?? null;
    if (!canPublishStory(consentStatus)) return;

    await db.execute(
      `UPDATE apparel_stories SET published_at = NOW() WHERE id = $1::uuid AND published_at IS NULL`,
      storyId,
    );
  } else {
    await db.execute(
      `UPDATE apparel_stories SET published_at = NULL WHERE id = $1::uuid`,
      storyId,
    );
  }

  const admin = await getAdminUser();
  const adminId = admin?.id ?? "00000000-0000-0000-0000-000000000000";
  const auditAction = action === "publish" ? "story.published" : "story.unpublished";
  await db.execute(
    `INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, payload)
     VALUES ($1::uuid, $2, 'story', $3, $4::jsonb)`,
    adminId,
    auditAction,
    storyId,
    JSON.stringify({ story_id: storyId }),
  );

  revalidatePath("/admin/stories");
}

function consentBadgeStyle(status: string | null): CSSProperties {
  if (status === "signed") {
    return { background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999 };
  }
  if (status === "revoked") {
    return { background: "#fee2e2", color: "#991b1b", fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999 };
  }
  return { background: "#fef9c3", color: "#854d0e", fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999 };
}

function publishedBadgeStyle(publishedAt: string | null): CSSProperties {
  return publishedAt
    ? { background: "#dbeafe", color: "#1d4ed8", fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999 }
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
  verticalAlign: "middle",
};

function fmt(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(ts);
  }
}

export default async function StoriesAdminPage(): Promise<JSX.Element> {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?redirect=/admin/stories");

  const stories = await fetchStories();

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Story Management
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
          Manage interview story content. A story can only be published after the
          subject&apos;s consent record is signed.
        </p>
        <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
          <a href="/admin/skus" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}>
            → SKU Admin
          </a>
          <a href="/admin" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>
            ← Back to Admin
          </a>
        </div>
      </div>

      {stories.length === 0 ? (
        <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 32, textAlign: "center", color: "#64748b" }}>
          No stories yet. Add interview subjects and link consent records to get started.
        </div>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Subject / Slug</th>
                <th style={th}>Pull Quote</th>
                <th style={th}>Consent</th>
                <th style={th}>FTC Comp.</th>
                <th style={th}>Published</th>
                <th style={{ ...th, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stories.map((story) => {
                const badgeLabel = consentBadgeLabel(story.consent_status);
                const publishable = canPublishStory(story.consent_status);
                const isPublished = story.published_at !== null;
                return (
                  <tr key={story.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{story.subject_first_name}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{story.slug}</div>
                    </td>
                    <td style={{ ...td, maxWidth: 260 }}>
                      {story.subject_pull_quote ? (
                        <span style={{ fontSize: 13, color: "#475569", fontStyle: "italic" }}>
                          &ldquo;{story.subject_pull_quote.slice(0, 80)}{story.subject_pull_quote.length > 80 ? "…" : ""}&rdquo;
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td style={td}>
                      <span style={consentBadgeStyle(story.consent_status)}>{badgeLabel}</span>
                    </td>
                    <td style={td}>
                      {story.ftc_compensated ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#b45309" }}>Yes</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>No</span>
                      )}
                    </td>
                    <td style={td}>
                      <span style={publishedBadgeStyle(story.published_at)}>
                        {isPublished ? fmt(story.published_at) : "Draft"}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {isPublished ? (
                        <form action={togglePublish}>
                          <input type="hidden" name="id" value={story.id} />
                          <input type="hidden" name="action" value="unpublish" />
                          <button
                            type="submit"
                            style={{ fontSize: 13, padding: "5px 14px", borderRadius: 7, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", cursor: "pointer" }}
                          >
                            Unpublish
                          </button>
                        </form>
                      ) : (
                        <form action={togglePublish}>
                          <input type="hidden" name="id" value={story.id} />
                          <input type="hidden" name="action" value="publish" />
                          <button
                            type="submit"
                            disabled={!publishable}
                            title={!publishable ? "Consent must be signed before publishing" : undefined}
                            style={{
                              fontSize: 13,
                              padding: "5px 14px",
                              borderRadius: 7,
                              border: publishable ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                              background: publishable ? "#fff" : "#f8fafc",
                              color: publishable ? "#15803d" : "#94a3b8",
                              cursor: publishable ? "pointer" : "not-allowed",
                            }}
                          >
                            Publish
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
