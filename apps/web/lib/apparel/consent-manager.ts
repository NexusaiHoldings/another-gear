"use server";

import { buildDb } from "@/lib/db";
import { buildEventBus } from "@/lib/events";
import { storeBlob } from "@/lib/file-storage";
import { getAdminUser } from "@/lib/admin-auth";
import { handleRegisterFile } from "@nexus/files-and-media";
import { UNKNOWN_ADMIN_USER_ID } from "@nexus/admin-console";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export interface InterviewSubject {
  id: string;
  first_name: string;
  email: string;
  consent_status: "pending" | "signed" | "revoked";
  signed_at: string | null;
  created_at: string;
  release_document_url: string | null;
}

export async function listSubjects(): Promise<InterviewSubject[]> {
  const db = buildDb();
  const rows = await db.query<InterviewSubject>(
    `SELECT
       s.id,
       s.first_name,
       s.email,
       s.consent_status,
       s.signed_at,
       s.created_at,
       cr.release_document_url
     FROM apparel_interview_subjects s
     LEFT JOIN LATERAL (
       SELECT release_document_url
       FROM apparel_consent_records
       WHERE subject_id = s.id
       ORDER BY created_at DESC
       LIMIT 1
     ) cr ON TRUE
     ORDER BY s.created_at DESC`,
  );
  return rows;
}

export async function createSubjectAction(formData: FormData): Promise<void> {
  const firstName = ((formData.get("first_name") as string | null) ?? "").trim();
  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase();

  if (!firstName || !email) {
    throw new Error("first_name and email are required");
  }

  const db = buildDb();
  await db.execute(
    `INSERT INTO apparel_interview_subjects (first_name, email)
     VALUES ($1, $2)`,
    firstName,
    email,
  );

  const admin = await getAdminUser();
  await writeAuditLog(
    admin?.id ?? UNKNOWN_ADMIN_USER_ID,
    "subject.created",
    "interview_subject",
    email,
    { first_name: firstName, email },
  );

  revalidatePath("/admin/subjects");
}

export async function uploadReleaseDocumentAction(
  formData: FormData,
): Promise<void> {
  const subjectId = ((formData.get("subject_id") as string | null) ?? "").trim();
  const file = formData.get("release_pdf") as File | null;

  if (!subjectId) throw new Error("subject_id is required");
  if (!file || file.size === 0) throw new Error("release_pdf file is required");

  const bytes = Buffer.from(await file.arrayBuffer());
  const blobKey = await storeBlob(bytes, file.type || "application/pdf");

  const db = buildDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registerResult = await handleRegisterFile(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { db: db as any, events: buildEventBus() as any },
    {
      filename: file.name || "release.pdf",
      mime_type: file.type || "application/pdf",
      size_bytes: bytes.length,
      storage_key: blobKey,
    },
  );

  const fileBody = registerResult.body as Record<string, unknown>;
  const fileId =
    typeof fileBody?.file_id === "string" ? fileBody.file_id : blobKey;
  const releaseDocUrl = `/api/files/${fileId}/download`;

  const hdrs = headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    "unknown";
  const signedAt = new Date().toISOString();

  // Link to the most recent story for this subject if one exists
  const storyRows = await db.query<{ id: string }>(
    `SELECT s.id
     FROM apparel_stories s
     JOIN apparel_interview_subjects sub ON s.subject_first_name = sub.first_name
     WHERE sub.id = $1
     ORDER BY s.created_at DESC
     LIMIT 1`,
    subjectId,
  );

  if (storyRows.length > 0) {
    const storyId = storyRows[0].id;
    await db.execute(
      `INSERT INTO apparel_consent_records
         (subject_id, story_id, release_document_url, signed_at, ip_address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (story_id) DO UPDATE
         SET release_document_url = EXCLUDED.release_document_url,
             signed_at            = EXCLUDED.signed_at,
             ip_address           = EXCLUDED.ip_address`,
      subjectId,
      storyId,
      releaseDocUrl,
      signedAt,
      ip,
    );
  }

  await db.execute(
    `UPDATE apparel_interview_subjects
     SET consent_status = 'signed', signed_at = $1
     WHERE id = $2`,
    signedAt,
    subjectId,
  );

  const admin = await getAdminUser();
  await writeAuditLog(
    admin?.id ?? UNKNOWN_ADMIN_USER_ID,
    "consent.signed",
    "interview_subject",
    subjectId,
    { release_document_url: releaseDocUrl, signed_at: signedAt, ip_address: ip },
  );

  revalidatePath("/admin/subjects");
}

export async function revokeConsentAction(formData: FormData): Promise<void> {
  const subjectId = ((formData.get("subject_id") as string | null) ?? "").trim();
  if (!subjectId) throw new Error("subject_id is required");

  const db = buildDb();

  // Cascade: unpublish stories linked to this subject's consent records
  await db.execute(
    `UPDATE apparel_stories AS st
     SET published_at = NULL
     FROM apparel_consent_records AS cr
     WHERE cr.story_id = st.id
       AND cr.subject_id = $1`,
    subjectId,
  );

  await db.execute(
    `UPDATE apparel_interview_subjects
     SET consent_status = 'revoked'
     WHERE id = $1`,
    subjectId,
  );

  const admin = await getAdminUser();
  await writeAuditLog(
    admin?.id ?? UNKNOWN_ADMIN_USER_ID,
    "consent.revoked",
    "interview_subject",
    subjectId,
    { revoked_at: new Date().toISOString() },
  );

  revalidatePath("/admin/subjects");
}

async function writeAuditLog(
  adminUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const db = buildDb();
    await db.execute(
      `INSERT INTO admin_audit_log
         (admin_user_id, action, target_type, target_id, payload)
       VALUES ($1::uuid, $2, $3, $4, $5::jsonb)`,
      adminUserId,
      action,
      targetType,
      targetId,
      JSON.stringify(payload),
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "audit_log_write_failed",
        action,
        error: String(err),
      }),
    );
  }
}
