import type { RequestHandler } from "@builder.io/qwik-city";
import { adminApproveArticle, adminDeleteArticle, adminUpdateArticle } from "~/lib/admin-db";

export const onPost: RequestHandler = async ({ json, request }) => {
  try {
    const body = await request.json() as {
      action: "approve" | "delete" | "update";
      articleId: string;
      password: string;
      summary?: string;
      category?: string;
    };

    const { action, articleId, password } = body ?? {};

    if (!password || password !== import.meta.env.VITE_ADMIN_PASSWORD) {
      json(401, { error: "Nesprávne heslo" });
      return;
    }
    if (!articleId) {
      json(400, { error: "Chýba articleId" });
      return;
    }

    if (action === "approve") {
      await adminApproveArticle(articleId);
    } else if (action === "delete") {
      await adminDeleteArticle(articleId);
    } else if (action === "update") {
      await adminUpdateArticle(articleId, {
        summary: body.summary,
        category: body.category,
      });
    } else {
      json(400, { error: "Neznáma akcia" });
      return;
    }

    json(200, { ok: true });
  } catch (err: any) {
    json(500, { error: err?.message ?? "Interná chyba servera" });
  }
};
