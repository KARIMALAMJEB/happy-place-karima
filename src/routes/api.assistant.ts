import { createFileRoute } from "@tanstack/react-router";

// POST /api/assistant { question } + en-tête Authorization: Bearer <jeton de session>
// → { answer, sources: [{ titre, type, lien }], mode, ia, contact? }
// Les droits sont ceux de la personne connectée : les actualités sont lues avec SON jeton (règles d'accès de la base),
// la Boîte à outils est filtrée selon son rôle et ses équipes. Les demandes ne sont jamais lues.
const INDISPONIBLE = {
  answer: "L'assistant est indisponible pour le moment, essaie la recherche en haut de page.",
  sources: [],
  mode: "indisponible",
  ia: false,
};

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { repondreAuNom } = await import("@/lib/assistant/acces.server");
          const corps = (await request.json()) as { question?: unknown };
          const question = typeof corps.question === "string" ? corps.question : "";
          const jeton = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
          if (!jeton) return Response.json({ ...INDISPONIBLE, answer: "Connecte-toi pour utiliser l'assistant." }, { status: 401 });
          return Response.json(await repondreAuNom(question, jeton));
        } catch {
          return Response.json(INDISPONIBLE, { status: 200 });
        }
      },
    },
  },
});
