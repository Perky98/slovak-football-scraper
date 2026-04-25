import type { RequestHandler } from "@builder.io/qwik-city";
import { getAdminDb } from "~/lib/admin-db";

export const onPost: RequestHandler = async ({ json, request }) => {
  try {
    const body = await request.json() as {
      action: "approve" | "delete";
      articleId: string;
      password: string;
    };

    const { action, articleId, password } = body;

    if (password !== import.meta.env.VITE_ADMIN_PASSWORD) {
      json(401, { error: "Nesprávne heslo" });
      return;
    }

    if (!articleId) {
      json(400, { error: "Chýba articleId" });
      return;
    }

    const db = getAdminDb();

    if (action === "approve") {
      await db.collection("articles").doc(articleId).update({ approved: true });
    } else if (action === "delete") {
      await db.collection("articles").doc(articleId).delete();
    } else {
      json(400, { error: "Neznáma akcia" });
      return;
    }

    json(200, { ok: true });
  } catch (err: any) {
    json(500, { error: err?.message ?? "Interná chyba servera" });
  }
};
