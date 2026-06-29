import type { JSX, CSSProperties } from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import {
  listSubjects,
  createSubjectAction,
  uploadReleaseDocumentAction,
  revokeConsentAction,
  type InterviewSubject,
} from "@/lib/apparel/consent-manager";

export const dynamic = "force-dynamic";

const thStyle: CSSProperties = {
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

const tdStyle: CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
  color: "#0f172a",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "middle",
};

const STATUS_STYLES: Record<string, CSSProperties> = {
  signed: { background: "#dcfce7", color: "#166534" },
  pending: { background: "#fef9c3", color: "#92400e" },
  revoked: { background: "#fee2e2", color: "#991b1b" },
};

function fmt(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(ts);
  }
}

function StatusPill({ status }: { status: string }): JSX.Element {
  const style: CSSProperties = STATUS_STYLES[status] ?? {
    background: "#f1f5f9",
    color: "#475569",
  };
  return (
    <span
      style={{
        ...style,
        fontSize: 12,
        fontWeight: 600,
        padding: "2px 10px",
        borderRadius: 999,
        textTransform: "capitalize",
        display: "inline-block",
      }}
    >
      {status}
    </span>
  );
}

function SubjectRow({ subject }: { subject: InterviewSubject }): JSX.Element {
  return (
    <tr>
      <td style={tdStyle}>{subject.first_name}</td>
      <td style={{ ...tdStyle, color: "#64748b" }}>{subject.email}</td>
      <td style={tdStyle}>
        <StatusPill status={subject.consent_status} />
      </td>
      <td style={{ ...tdStyle, color: "#64748b" }}>{fmt(subject.signed_at)}</td>
      <td style={tdStyle}>
        {subject.release_document_url ? (
          <a
            href={subject.release_document_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2563eb", fontSize: 13, textDecoration: "underline" }}
          >
            View PDF
          </a>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: 13 }}>No document</span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: "right" }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {subject.consent_status !== "signed" && (
            <form
              action={uploadReleaseDocumentAction}
              encType="multipart/form-data"
              style={{ display: "flex", gap: 6, alignItems: "center" }}
            >
              <input type="hidden" name="subject_id" value={subject.id} />
              <input
                type="file"
                name="release_pdf"
                accept=".pdf,application/pdf"
                required
                style={{ fontSize: 12, maxWidth: 180 }}
              />
              <button
                type="submit"
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#15803d",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Upload Release
              </button>
            </form>
          )}
          {subject.consent_status !== "revoked" && (
            <form action={revokeConsentAction}>
              <input type="hidden" name="subject_id" value={subject.id} />
              <button
                type="submit"
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: "1px solid #fecaca",
                  background: "#fff",
                  color: "#b91c1c",
                  fontWeight: 600,
                }}
              >
                Revoke
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}

export default async function SubjectsAdminPage(): Promise<JSX.Element> {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?redirect=/admin/subjects");

  const subjects = await listSubjects();

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Interview Subjects
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
          Review and approve consent and release forms before content publication.
        </p>
      </div>

      {/* Add Subject Section */}
      <details style={{ marginBottom: 24 }}>
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            color: "#0f172a",
            padding: "10px 16px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            userSelect: "none",
            listStyle: "none",
          }}
        >
          + Add Interview Subject
        </summary>
        <form
          action={createSubjectAction}
          style={{
            display: "flex",
            gap: 12,
            marginTop: 0,
            padding: "16px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              htmlFor="first_name"
              style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}
            >
              First Name
            </label>
            <input
              id="first_name"
              name="first_name"
              placeholder="e.g. Jordan"
              required
              style={{
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 7,
                fontSize: 14,
                minWidth: 160,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              htmlFor="email"
              style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="subject@example.com"
              required
              style={{
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 7,
                fontSize: 14,
                minWidth: 220,
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "8px 20px",
              background: "#0f172a",
              color: "#fff",
              borderRadius: 7,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
            }}
          >
            Add Subject
          </button>
        </form>
      </details>

      {/* Subject list or empty state */}
      {subjects.length === 0 ? (
        <div
          style={{
            border: "2px dashed #e2e8f0",
            borderRadius: 12,
            padding: "56px 32px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 16, color: "#475569", margin: "0 0 12px" }}>
            No interview subjects yet — add your first subject before filming.
          </p>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
            Use the <strong>+ Add Interview Subject</strong> panel above to get
            started.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Signed At</th>
                <th style={thStyle}>Release Document</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <SubjectRow key={subject.id} subject={subject} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
