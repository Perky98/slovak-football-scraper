import type { RequestHandler } from "@builder.io/qwik-city";
import { adminApproveArticle, adminDeleteArticle } from "~/lib/admin-db";

export const onPost: RequestHandler = async ({ json, request }) => {
  try {
    const body = await request.json() as {
      action: "approve" | "delete";
      articleId: string;
      password: string;
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
    } else {
      json(400, { error: "Neznáma akcia" });
      return;
    }

    json(200, { ok: true });
  } catch (err: any) {
    json(500, { error: err?.message ?? "Interná chyba servera" });
  }
};
