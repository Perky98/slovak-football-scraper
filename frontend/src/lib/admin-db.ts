import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function loadServiceAccount(): ServiceAccount {
  const credPath =
    process.env.FIREBASE_CREDENTIALS_PATH ??
    resolve(process.cwd(), "..", "scraper", "serviceAccountKey.json");
  return JSON.parse(readFileSync(credPath, "utf-8"));
}

async function getAccessToken(): Promise<string> {
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");

  const toSign = `${header}.${claims}`;
  const sig = createSign("RSA-SHA256").update(toSign).sign(sa.private_key, "base64url");
  const jwt = `${toSign}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json() as { access_token: string; error?: string };
  if (data.error) throw new Error(`Token error: ${data.error}`);
  return data.access_token;
}

const FIRESTORE_BASE = (projectId: string) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/articles`;

export async function adminDeleteArticle(articleId: string) {
  const sa = loadServiceAccount();
  const token = await getAccessToken();
  const res = await fetch(`${FIRESTORE_BASE(sa.project_id)}/${articleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`DELETE failed: ${res.status} ${await res.text()}`);
}

export async function adminUpdateArticle(
  articleId: string,
  fields: { summary?: string; category?: string }
) {
  const sa = loadServiceAccount();
  const token = await getAccessToken();

  const firestoreFields: Record<string, unknown> = {};
  const mask: string[] = [];

  if (fields.summary !== undefined) {
    firestoreFields.summary = { stringValue: fields.summary };
    mask.push("summary");
  }
  if (fields.category !== undefined) {
    firestoreFields.category = { stringValue: fields.category };
    mask.push("category");
  }
  if (mask.length === 0) return;

  const maskQuery = mask.map((f) => `updateMask.fieldPaths=${f}`).join("&");
  const res = await fetch(
    `${FIRESTORE_BASE(sa.project_id)}/${articleId}?${maskQuery}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: firestoreFields }),
    }
  );
  if (!res.ok) throw new Error(`PATCH failed: ${res.status} ${await res.text()}`);
}

export async function adminApproveArticle(articleId: string) {
  const sa = loadServiceAccount();
  const token = await getAccessToken();
  const res = await fetch(
    `${FIRESTORE_BASE(sa.project_id)}/${articleId}?updateMask.fieldPaths=approved`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: { approved: { booleanValue: true } } }),
    }
  );
  if (!res.ok) throw new Error(`PATCH failed: ${res.status} ${await res.text()}`);
}
