import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { resolve } from "node:path";

export function getAdminDb() {
  if (!getApps().length) {
    const credPath =
      process.env.FIREBASE_CREDENTIALS_PATH ??
      resolve(process.cwd(), "..", "scraper", "serviceAccountKey.json");
    initializeApp({ credential: cert(credPath) });
  }
  return getFirestore();
}
