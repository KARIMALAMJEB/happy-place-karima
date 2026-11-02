import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, LogIn, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HpButton } from "@/components/hp/button";

// Connexion réelle : e-mail + mot de passe, ou lien de connexion envoyé par e-mail.
// Seules les adresses de la liste blanche entrent (contrôle dans /_authenticated, appliqué par la base via les règles RLS).
// Une personne non autorisée est déconnectée tout de suite, avec un message explicite (consigne du kick-off).

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { refus?: boolean } => ({ refus: s.refus === true || s.refus === "1" || s.refus === 1 ? true : undefined }),
  head: () => ({
    meta: [
      { title: "Happy Place — Connexion" },
      { name: "description", content: "Happy Place, le dashboard interne de Bigger Boat." },
    ],
  }),
  component: Connexion,
});

const champ = "min-h-11 w-full border border-field bg-white px-3 text-[14px] leading-5 text-ink";

function Connexion() {
  const navigate = useNavigate();
  const { refus } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [voir, setVoir] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Déjà connecté (ou retour d'un lien de connexion) : direction l'accueil, qui vérifie la liste blanche
  useEffect(() => {
    let annule = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!annule && data.session && !refus) navigate({ to: "/" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "SIGNED_IN" && session && !refus) navigate({ to: "/" });
    });
    return () => {
      annule = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, refus]);

  async function connecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setInfo(null);
    if (!email.trim() || !mdp) return setErreur("Saisis ton e-mail et ton mot de passe.");
    setEnvoi(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: mdp });
    setEnvoi(false);
    if (error) return setErreur("E-mail ou mot de passe incorrect.");
    navigate({ to: "/" });
  }

  async function lienMagique() {
    setErreur(null);
    setInfo(null);
    if (!email.trim()) return setErreur("Saisis ton e-mail pour recevoir un lien de connexion.");
    setEnvoi(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth` },
    });
    setEnvoi(false);
    // Même message dans tous les cas : on ne révèle pas si une adresse est connue
    if (error && /rate|too many|seconds/i.test(error.message)) return setErreur("Trop de demandes. Réessaie dans une minute.");
    setInfo("Si cette adresse est autorisée, un lien de connexion vient de t'être envoyé. Ouvre-le sur cet appareil.");
  }

  return (
    <div className="hp-shell flex min-h-screen flex-col bg-ecru">
      <header className="flex h-16 items-center border-b border-line bg-white px-4 lg:px-8">
        <span className="flex flex-col">
          <span className="label text-ink-2">BIGGER BOAT</span>
          <span className="font-title text-[18px] leading-6 font-bold">HAPPY PLACE</span>
        </span>
      </header>
      <main id="contenu" className="flex flex-1 items-center justify-center px-4 py-8">
        <section className="flex w-[min(100%,28rem)] flex-col gap-5 border border-line border-l-4 border-l-anthracite bg-white p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] leading-9">Connexion</h1>
            <p className="text-[14px] leading-5 text-ink-2">Accès réservé aux adresses autorisées par l'admin.</p>
          </div>

          {refus && (
            <p role="alert" className="border border-[#C2272D] border-l-4 bg-white px-4 py-3 text-[14px] leading-5">
              <span className="font-semibold">Accès refusé.</span> Cette adresse n'est pas dans la liste des personnes autorisées. Demande à un admin de t'ajouter, puis reconnecte-toi.
            </p>
          )}

          <form noValidate onSubmit={connecter} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="label text-ink">E-mail</label>
              <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={champ} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="mdp" className="label text-ink">Mot de passe</label>
              <div className="relative">
                <input id="mdp" type={voir ? "text" : "password"} autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} className={`${champ} pr-12`} />
                <button
                  type="button"
                  onClick={() => setVoir((v) => !v)}
                  aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={voir}
                  className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-ink-2 hover:text-ink"
                >
                  {voir ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                </button>
              </div>
            </div>
            {erreur && <p role="alert" className="text-[12px] leading-4 font-semibold text-[#8E1A1F]">{erreur}</p>}
            {info && <p role="status" className="text-[14px] leading-5">{info}</p>}
            <HpButton type="submit" role="principal" icon={LogIn} disabled={envoi} className="w-full">
              {envoi ? "CONNEXION…" : "SE CONNECTER"}
            </HpButton>
          </form>

          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-[12px] leading-4 text-ink-2">Pas de mot de passe sous la main ?</p>
            <HpButton role="consulte" icon={Mail} disabled={envoi} onClick={lienMagique} className="w-full">
              RECEVOIR UN LIEN DE CONNEXION
            </HpButton>
          </div>
        </section>
      </main>
    </div>
  );
}
