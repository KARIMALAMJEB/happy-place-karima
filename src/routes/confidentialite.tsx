import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { hpButtonVariants } from "@/components/hp/button";

export const Route = createFileRoute("/confidentialite")({ component: Confidentialite });

// Adresse fictive (démo), reprise du prototype
const CONTACT = "donnees-personnelles@bigger-boat.example";

const lienMail = "inline-flex min-h-6 items-center font-semibold underline underline-offset-2";

function Bloc({ id, titre, children }: { id?: string; titre: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-3 border border-line border-l-4 border-l-anthracite bg-white p-6">
      <h2 className="text-[24px] leading-8">{titre}</h2>
      <div className="flex max-w-[80ch] flex-col gap-2 text-[14px] leading-6">{children}</div>
    </section>
  );
}

function Confidentialite() {
  const router = useRouter();
  return (
    <div className="hp-shell flex min-h-screen flex-col bg-ecru">
      <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 lg:px-8">
        <span className="flex flex-col">
          <span className="label text-ink-2">BIGGER BOAT</span>
          <span className="font-title text-[18px] leading-6 font-bold">HAPPY PLACE</span>
        </span>
        <Link
          to="/"
          onClick={(e) => {
            if (router.history.canGoBack()) {
              e.preventDefault();
              router.history.back();
            }
          }}
          className={hpButtonVariants({ role: "consulte" })}
        >
          <ArrowLeft size={16} aria-hidden />
          <span>RETOUR</span>
        </Link>
      </header>
      <main id="contenu" tabIndex={-1} className="flex-1 focus:outline-none">
        <div className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 py-8 lg:px-8">
          <header className="flex flex-col gap-2 border border-line bg-white px-8 py-6">
            <h1 className="text-[36px] leading-[44px]">Confidentialité et données personnelles</h1>
            <p className="text-[16px] leading-6">
              Comment Happy Place traite les informations de tes demandes. Application de démonstration : toutes les données sont fictives.
            </p>
          </header>

          <Bloc titre="Données collectées">
            <ul className="list-disc pl-5">
              <li>Titre et description de la demande.</li>
              <li>Pièces jointes (PDF, 20 Mo maximum).</li>
              <li>Identité du demandeur : nom et équipe, issus de ton compte. Ils ne sont pas ressaisis.</li>
              <li>Nature, visibilité, personne qui décide et thème choisis au dépôt.</li>
            </ul>
          </Bloc>

          <Bloc titre="Finalité">
            <p>Traiter tes demandes internes : les faire décider, suivre les blocages et t'informer de la réponse. Les données ne servent à rien d'autre.</p>
          </Bloc>

          <Bloc titre="Durée de conservation proposée">
            <ul className="list-disc pl-5">
              <li>Demandes : 12 mois.</li>
              <li>Pièces jointes : 6 mois après la clôture de la demande.</li>
            </ul>
          </Bloc>

          <Bloc titre="Destinataires">
            <ul className="list-disc pl-5">
              <li>La personne qui décide, choisie au dépôt.</li>
              <li>L'admin, pour la supervision.</li>
              <li>
                Selon la visibilité choisie : Tous, Mon équipe ou Mon manager uniquement. Avec l'option « Identité confidentielle », seule la
                personne qui décide voit ton nom.
              </li>
            </ul>
          </Bloc>

          <Bloc titre="Tes droits">
            <p>Tu peux demander l'accès à tes données, leur rectification ou leur effacement.</p>
            <p>
              Contact :{" "}
              <a href={`mailto:${CONTACT}`} className={lienMail}>
                {CONTACT}
              </a>{" "}
              (adresse fictive)
            </p>
          </Bloc>

          <Bloc id="assistant-ia" titre="Assistant IA">
            <p>
              <span className="font-semibold">Finalité.</span> Retrouver une information dans les contenus de Happy Place : actualités publiées,
              process et documents de la Boîte à outils. L'assistant ne prend aucune décision sur une personne.
            </p>
            <p>
              <span className="font-semibold">Données traitées.</span> La question que tu saisis et les extraits de contenus que tu as le droit de
              lire. Une question qui contient un e-mail, un numéro de téléphone ou un numéro à 13 chiffres n'est pas traitée : l'assistant te
              demande de la reformuler.
            </p>
            <p>
              <span className="font-semibold">Ce qui n'est jamais envoyé au modèle.</span> Les demandes, privées ou non, leurs pièces jointes et
              les identités confidentielles. Seuls partent les extraits autorisés par tes droits.
            </p>
            <p>
              <span className="font-semibold">Sous-traitant.</span> Cloudflare Workers AI, à confirmer avec le contrat de traitement des données
              et le lieu de traitement avant la mise en ligne.
            </p>
            <p>
              <span className="font-semibold">Conservation.</span> Le texte des questions et des réponses n'est pas conservé. Un journal technique
              garde seulement la date, le rôle du profil, le nombre de sources, le mode (IA ou sans IA) et l'erreur éventuelle, pendant 30 jours
              au plus.
            </p>
            <p>
              <span className="font-semibold">Mode sans IA.</span> Sans modèle disponible, l'assistant affiche un extrait tiré mot pour mot du
              contenu, avec sa source, sans rien rédiger.
            </p>
            <p>
              <span className="font-semibold">Tes droits.</span> Tu peux demander l'accès à ces données, leur rectification ou t'opposer à leur
              traitement, à l'adresse{" "}
              <a href={`mailto:${CONTACT}`} className={lienMail}>
                {CONTACT}
              </a>{" "}
              (adresse fictive).
            </p>
          </Bloc>

          <Bloc id="mentions-legales" titre="Mentions légales">
            <p>
              Happy Place V2 est une application réalisée dans le cadre de la formation Product Builder (Maestro). Bigger Boat est un cabinet
              fictif ; personnes, demandes et adresses sont fictives.
            </p>
          </Bloc>
        </div>
      </main>
      <footer className="flex items-center gap-2 border-t border-line px-4 py-4 text-[12px] leading-4 text-ink-2 lg:px-8">
        <Link to="/confidentialite" className="inline-flex min-h-6 items-center underline underline-offset-2 hover:text-ink">
          Confidentialité
        </Link>
        <span aria-hidden>·</span>
        <Link to="/confidentialite" hash="mentions-legales" className="inline-flex min-h-6 items-center underline underline-offset-2 hover:text-ink">
          Mentions légales
        </Link>
        <span aria-hidden>·</span>
        <span>Happy Place V2 (démo)</span>
      </footer>
    </div>
  );
}
