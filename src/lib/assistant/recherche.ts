import { RESSOURCES, ressourceVisible, type Ressource } from "@/lib/outils";
import { GUIDE, type ArticleGuide, type ProfilId } from "./guide";

// Profil de la personne qui pose la question : son rôle et ses équipes (la sienne, puis celles qu'elle gère)
export type Profil = { id: ProfilId; equipes: string[] };
// Actualité telle que lue en base (déjà filtrée par les règles d'accès de la base) : publiée uniquement
export type ActualiteLue = { id: string; title: string; body: string | null };

// Recherche de l'Assistant : par mots, sans accents ni casse, dans les seuls contenus lisibles par la personne.
// Index : guide de l'outil, actualités publiées, process et documents de la Boîte à outils. Jamais les demandes, leurs pièces jointes ni les avis de départ.

export type TypeSource = "Guide" | "Actualité" | "Process" | "Document";
export type Source = { titre: string; type: TypeSource; lien: string };
export type Extrait = Source & { score: number; phrases: string[]; texte: string };

const VIDES = new Set(
  "a ai as au aux avec c ca ce ces cet cette comment combien d dans de des dit dois doit du elle en est et faire fait faut happy il ils j je l la le les leur lui m ma me mes moi mon n ne nous on ou par pas peut peux place plus pour quand que quel quelle quelles quels qui quoi qu s sa se ses si son sont sur ta te tes toi ton tu un une vos votre vous y lieu date aura avoir etre savoir trouver existe moment deroule tient passe servent sert marche fonctionne utiliser puis veux voudrais temps".split(" "),
);
// Mots trop courants pour suffire : ils comptent s'ils sont présents, mais ne remplacent jamais un mot précis absent
const FAIBLES = new Set(["dema", "ques", "info", "aide"]);

// Vocabulaire de Happy Place (racines) : une question sans aucun de ces mots et sans résultat est hors sujet
const DOMAINE = (
  "happy bigger cabinet entreprise equipe salari collabor manager admin people direction profil demande depos valid refus relanc clarif complet " +
  "motif statut attente bloqu brouillon visibil confidenti anonym actualit publi annonce redig fil carrousel indicateur effectif mandat objectif " +
  "boite outil process document guide annuaire organigramme contact mail notification conge absence rtt teletravail frais remboursement depense " +
  "formation budget arrivee depart onboarding integration cooptation recrut candidat mission client factur acces licence materiel ecran badge salle " +
  "reunion seminaire point travail bureau poste paie contrat donnee rgpd assistant ia accueil tableau page menu"
).split(" ");

export const normaliser = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Racine courte : « valider », « validation » et « validée » se rejoignent ; pluriels ignorés
const racine = (mot: string) => (mot.length <= 4 ? mot.replace(/[sx]$/, "") : mot.slice(0, Math.max(4, mot.length - 3)));
export const termes = (question: string) => [...new Set(normaliser(question).split(" ").filter((m) => m.length > 1 && !VIDES.has(m)))].map(racine);

// Une phrase qui donne des ordres au lecteur ou à l'assistant n'est jamais reprise : elle est retirée de l'index
const CONSIGNE = /\b(ignore|oublie|ne tiens pas compte)\b.*\b(consignes?|instructions?|regles?)\b|\breponds? (que|uniquement)\b|\b(tu es|agis comme) (un|une|l)\b/;
export const ressembleAConsigne = (phrase: string) => CONSIGNE.test(normaliser(phrase));

const decouper = (texte: string) =>
  texte
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter((p) => p && !ressembleAConsigne(p));

export type Doc = Source & { titreNorm: string[]; chapeau: string[]; phrases: string[]; motsPhrases: string[][] };

// Phrases d'introduction (« Ce process explique… ») : utiles à la recherche, jamais reprises comme réponse
const INTRO = /^(ce|cette) (process|document|note)\b/;

const versDoc = (titre: string, type: TypeSource, lien: string, corps: string, chapeau = ""): Doc => {
  const phrases = decouper(corps).filter((p) => !INTRO.test(normaliser(p)));
  return {
    titre,
    type,
    lien,
    titreNorm: normaliser(titre).split(" "),
    chapeau: normaliser(`${chapeau} ${decouper(corps).filter((p) => INTRO.test(normaliser(p))).join(" ")}`).split(" "),
    phrases,
    motsPhrases: phrases.map((p) => normaliser(p).split(" ")),
  };
};

const lienGuide = (a: ArticleGuide) => (a.page.startsWith("/") ? a.page : `/${a.page}`);

// Contenus lisibles par la personne : guide filtré par profil, actualités publiées lisibles (droits appliqués par la base),
// process et documents de la Boîte à outils visibles pour son rôle et ses équipes
export function corpus(profil: Profil, actualites: ActualiteLue[] = [], ressources: Ressource[] = RESSOURCES, guide: ArticleGuide[] = GUIDE): Doc[] {
  const articles = guide
    .filter((a) => a.profils === "tous" || a.profils.includes(profil.id))
    .map((a) => versDoc(a.titre, "Guide", lienGuide(a), a.texte, a.motsCles.join(" ")));
  const actus = actualites.map((a) => versDoc(a.title, "Actualité", "/actualites", [a.title, a.body].filter(Boolean).join(". ")));
  const outils = ressources
    .filter((r) => r.texte && r.type && ressourceVisible(r, profil.id, profil.equipes))
    .map((r) => versDoc(r.titre, r.type === "process" ? "Process" : "Document", `/boite-a-outils/${r.id}`, r.texte ?? "", r.description));
  return [...articles, ...actus, ...outils];
}

// La question parle-t-elle de Happy Place (l'outil, ses contenus, ses règles) ?
export const dansLePerimetre = (question: string) => normaliser(question).split(" ").some((m) => DOMAINE.some((r) => m.startsWith(r)));

const contient = (mots: string[], t: string) => mots.some((m) => m.startsWith(t));

// Seuil : tous les mots précis de la question doivent être présents ; un mot courant (« demande ») peut manquer,
// mais une question faite seulement de mots courants doit en retrouver au moins un
// Jusqu'à 3 mots précis : tous requis (« congé sabbatique » ne retombe pas sur « congés »).
// À partir de 4 (question à deux sujets) : les trois quarts suffisent, chaque mot étant cherché séparément.
const pertinent = (q: string[], trouves: string[]) => {
  const precis = q.filter((t) => !FAIBLES.has(t));
  if (!precis.length) return trouves.length > 0;
  const communs = precis.filter((t) => trouves.includes(t)).length;
  return precis.length <= 3 ? communs === precis.length : communs >= Math.ceil(precis.length * 0.75);
};
// Classement : nombre de mots communs d'abord ; à égalité, le guide passe avant les autres sources, puis les mots du titre
const scoreDe = (trouves: string[], titre: string[], guide: boolean) =>
  trouves.length * 100 + (guide ? 50 : 0) + trouves.filter((t) => contient(titre, t)).length * 10;

export function rechercher(question: string, docs: Doc[]): Extrait[] {
  const q = termes(question);
  if (q.length === 0) return [];
  return docs
    .map((d) => {
      const tous = [d.titreNorm, d.chapeau, ...d.motsPhrases].flat();
      const trouves = q.filter((t) => contient(tous, t));
      if (!pertinent(q, trouves)) return undefined;
      const score = scoreDe(trouves, d.titreNorm, d.type === "Guide");
      // 3 phrases les plus proches de la question, dans l'ordre du texte
      const notes = d.motsPhrases.map((m, i) => ({ i, n: q.filter((t) => contient(m, t)).length }));
      const meilleures = notes
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n || a.i - b.i)
        .slice(0, 3)
        .sort((a, b) => a.i - b.i)
        .map((x) => d.phrases[x.i]);
      const phrases = meilleures.length ? meilleures : d.phrases.slice(0, 2);
      return { titre: d.titre, type: d.type, lien: d.lien, score, phrases, texte: d.phrases.join(" ") };
    })
    .filter((e): e is Extrait => !!e)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
