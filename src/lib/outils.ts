// Boîte à outils de démonstration (reprise du prototype) : process, outils, infos RH et assistance.
// Contenu statique en lecture : l'ajout et la modification par l'admin viendront avec une table dédiée (voir Journal des modifications V2).

import { BookOpen, IdCard, LifeBuoy, Wrench, type LucideIcon } from "lucide-react";

export type CategorieOutil = "PROCESS" | "OUTILS" | "INFOS RH" | "ASSISTANCE ET SUPPORT";
export interface Ressource {
  id: string;
  titre: string;
  description: string;
  categorie: CategorieOutil;
  portee: string; // "entreprise" ou nom d'équipe
  page?: "annuaire" | "demandes" | "actualites"; // page de Happy Place
  url?: string; // lien externe
  pdf?: { nom: string; url: string }; // pièce jointe ajoutée par l'admin (en mémoire)
  type?: "process" | "document"; // contenu détaillé, lisible dans la Boîte à outils
  texte?: string;
}

export const RESSOURCES: Ressource[] = [
  { id: "r1", categorie: "PROCESS", titre: "Gestion des demandes internes", description: "Déposer une demande, suivre la décision et relancer après 5 jours ouvrés.", portee: "entreprise", page: "demandes" },
  { id: "r2", categorie: "PROCESS", titre: "Qui valide quoi", description: "Qui décide de chaque demande, selon l'équipe et la visibilité.", portee: "entreprise", page: "annuaire" },
  {
    id: "r3",
    categorie: "PROCESS",
    type: "process",
    titre: "Publier une actualité (fictif)",
    description: "Comment publier une actualité dans Happy Place, selon son périmètre.",
    portee: "entreprise",
    page: "actualites",
    texte: "Ce process explique comment publier une actualité dans Happy Place. Toute personne qui rédige une actualité choisit d'abord son périmètre : Mon équipe, Plusieurs équipes ou Toute l'entreprise. Le manager publie seul pour son équipe ou pour plusieurs équipes, sans validation préalable. Pour toute l'entreprise, la publication demande l'autorisation d'un admin. Une actualité contient un titre, une catégorie, un texte mis en forme avec l'éditeur, jusqu'à 3 photos et jusqu'à 4 fichiers PDF de 20 Mo maximum. Avant d'envoyer, relis le texte et vérifie que les photos ne montrent aucune donnée personnelle. Tant qu'elle n'est pas envoyée, l'actualité reste un brouillon que tu peux reprendre à tout moment depuis Mes publications. Quand un admin autorise une annonce entreprise, son auteur la publie lui-même : elle apparaît alors dans le fil d'actualités et dans le carrousel du tableau de bord. Si l'admin refuse, l'auteur voit l'explication dans ses publications et peut corriger son texte avant une nouvelle demande. Une actualité publiée peut être archivée par son auteur ou par l'admin quand elle n'est plus d'actualité. La règle de publication complète est consultable par l'admin dans l'écran Règle de publication.",
  },
  { id: "r4", categorie: "PROCESS", titre: "Processus de recrutement", description: "Étapes d'évaluation et intégration des candidats.", portee: "entreprise" },
  { id: "r5", categorie: "OUTILS", titre: "Guide de Happy Place", description: "Prise en main du tableau de bord, des demandes et des actualités.", portee: "entreprise" },
  { id: "r6", categorie: "OUTILS", titre: "Outil de sourcing", description: "Accès, licences et bonnes pratiques de recherche de profils.", portee: "entreprise" },
  { id: "r7", categorie: "OUTILS", titre: "Outil de suivi commercial", description: "Suivi des comptes et des propositions en cours.", portee: "entreprise" },
  {
    id: "r8",
    categorie: "INFOS RH",
    type: "document",
    titre: "Congés et absences (fictif)",
    description: "Droits à congés, pose et validation des absences.",
    portee: "entreprise",
    texte: "Ce document présente les règles de congés de Bigger Boat. Chaque salarié à temps plein dispose de 25 jours ouvrés de congés payés par an, acquis au fil des mois, et de 10 jours de RTT. Les congés se posent dans l'outil de gestion des temps, puis ton manager les valide sous 5 jours ouvrés. Pour une absence de plus de 5 jours consécutifs, préviens ton manager au moins un mois à l'avance afin d'organiser la continuité des missions. Les congés non pris au 31 mai peuvent être reportés une fois, dans la limite de 5 jours, avec l'accord de ton manager. Les jours de RTT se prennent dans l'année civile et ne se reportent pas. En cas d'arrêt maladie, envoie ton justificatif à People sous 48 heures. Les absences exceptionnelles, comme un mariage, une naissance ou un déménagement, suivent la convention collective : People t'indique le nombre de jours correspondant. Le calendrier de l'équipe affiche les absences validées pour faciliter l'organisation des points d'équipe. Pour toute question sur ton solde de jours, adresse-toi à l'équipe People.",
  },
  {
    id: "r9",
    categorie: "INFOS RH",
    type: "document",
    titre: "Notes de frais (fictif)",
    description: "Déclarer ses frais professionnels et se faire rembourser.",
    portee: "entreprise",
    texte: "Ce document explique comment déclarer tes frais professionnels. Une note de frais se déclare dans le mois où la dépense a eu lieu, au plus tard le 5 du mois suivant. Chaque ligne doit être accompagnée d'un justificatif lisible : facture, ticket de caisse ou billet de transport. Les repas avec un client sont remboursés jusqu'à 25 euros par personne, hors alcool. Les trajets en train se font en seconde classe ; un trajet de plus de 3 heures peut se faire en première classe avec l'accord de ton manager. Les frais kilométriques suivent le barème fiscal en vigueur. Ton manager valide la note de frais, puis People contrôle les justificatifs avant le remboursement. Le remboursement est versé avec la paie du mois suivant. Une dépense importante prévue à l'avance, comme un salon ou une formation, ne passe pas par une note de frais : elle suit le process de validation d'une dépense. Une note incomplète t'est renvoyée avec la ligne à corriger. Garde les originaux de tes justificatifs jusqu'au remboursement. Pour toute question, contacte People.",
  },
  {
    id: "r10",
    categorie: "INFOS RH",
    type: "document",
    titre: "Télétravail (fictif)",
    description: "Règles de télétravail et jours sur site.",
    portee: "entreprise",
    texte: "Ce document fixe les règles de télétravail chez Bigger Boat. Après la période d'essai, chaque salarié peut télétravailler jusqu'à 2 jours par semaine. Les jours de télétravail se choisissent avec ton manager, en tenant compte des besoins de l'équipe et des rendez-vous clients. Le jour du point d'équipe mensuel se passe sur site pour toute l'équipe. Un jour de télétravail non utilisé ne se reporte pas sur la semaine suivante. Pour un besoin ponctuel, comme un déplacement ou une contrainte personnelle, tu peux demander un télétravail exceptionnel en déposant une demande dans Happy Place : ton manager décide. Chez toi, tu dois disposer d'une connexion stable et d'un espace calme pour les appels. Le matériel fourni par le cabinet, ordinateur et casque, sert pour le télétravail ; un écran supplémentaire peut être demandé par une demande d'équipement. Pendant les heures de travail, reste joignable sur les outils de l'équipe. Le télétravail peut être suspendu temporairement pour un séminaire, un kick-off ou une formation sur site. Pour toute question, adresse-toi à ton manager ou à People.",
  },
  { id: "r11", categorie: "ASSISTANCE ET SUPPORT", titre: "Accès ou licence manquante", description: "Déposer une demande d'accès : elle est suivie comme les autres demandes.", portee: "entreprise", page: "demandes" },
  { id: "r12", categorie: "ASSISTANCE ET SUPPORT", titre: "Trouver un interlocuteur", description: "L'annuaire indique l'équipe, le rôle et le manager de chacun.", portee: "entreprise", page: "annuaire" },
  // Process et documents RH détaillés (fictifs) : lus dans la Boîte à outils et cherchés par l'Assistant
  {
    id: "p-onboarding",
    categorie: "PROCESS",
    type: "process",
    titre: "Onboarding d'un nouvel arrivant (fictif)",
    description: "Étapes d'accueil d'un nouvel arrivant, de J-10 à la fin du parcours.",
    portee: "entreprise",
    texte: "Ce process décrit l'accueil d'un nouvel arrivant. Dix jours avant l'arrivée, People prépare le contrat, crée la fiche dans l'annuaire et prévient le manager. Le manager désigne un binôme dans l'équipe : il accompagne l'arrivant pendant ses premières semaines et répond à ses questions du quotidien. Cinq jours avant l'arrivée, le manager dépose les demandes d'accès aux outils et d'équipement dans Happy Place, pour que l'ordinateur et les licences soient prêts le premier jour. Le premier jour, People accueille l'arrivant, présente le cabinet et remet le matériel ; le manager présente l'équipe et les missions en cours. Le parcours d'intégration dure deux semaines : rencontres avec chaque direction, prise en main des outils, découverte des process et premiers dossiers suivis avec le binôme. L'arrivant est présenté à toute l'équipe lors du point d'équipe suivant. À la fin des deux semaines, le manager fait un point avec l'arrivant pour recueillir son ressenti et ajuster la suite. Un second point a lieu avant la fin de la période d'essai. Pour toute question, contacte People.",
  },
  {
    id: "p-depense",
    categorie: "PROCESS",
    type: "process",
    titre: "Validation d'une dépense (fictif)",
    description: "Qui valide une dépense, selon son montant.",
    portee: "entreprise",
    texte: "Ce process explique comment faire valider une dépense avant de l'engager. Il concerne tout achat prévu à l'avance : matériel, abonnement, prestation, salon ou événement. Commence par déposer une demande dans Happy Place, avec le montant, le besoin et un devis en pièce jointe au format PDF. Pour une dépense de moins de 500 euros, ton manager décide seul. À partir de 500 euros, la demande est validée par ton manager puis par la Direction Générale. Le manager peut demander des précisions avec le motif À clarifier : tu complètes alors ta demande et la renvoies. Une fois la dépense validée, People ou le Support et moyens généraux passe la commande ; ne commande rien toi-même avant la validation. Si la dépense est refusée, le motif t'est indiqué et tu peux déposer une nouvelle demande si ton besoin évolue. Une demande sans réponse depuis 5 jours ouvrés peut être relancée depuis Happy Place. Les petites dépenses imprévues engagées pendant une mission, comme un repas client ou un trajet, suivent le document Notes de frais.",
  },
  {
    id: "p-acces-it",
    categorie: "PROCESS",
    type: "process",
    titre: "Demande d'accès IT (fictif)",
    description: "Obtenir un accès ou une licence à un outil.",
    portee: "entreprise",
    texte: "Ce process explique comment obtenir un accès ou une licence à un outil. Dépose une demande dans Happy Place avec le thème Informatique. Indique l'outil concerné, la raison de l'accès et la date à laquelle tu en as besoin. Si tu ne peux pas poursuivre ton travail sans cet accès, choisis la nature Bloquante ; si tu peux continuer à travailler en attendant, choisis Non bloquante. Ton manager valide la demande. Une fois validée, le Support et moyens généraux prend en charge la création de l'accès ; pour une demande bloquante, un suivi du blocage s'ouvre après la validation, avec la personne qui prend en charge et une date cible, et passe par les étapes Ouvert, En cours puis Résolu. Tu reçois un message quand l'accès est prêt. Pour un nouvel arrivant, c'est le manager qui dépose les demandes d'accès cinq jours avant l'arrivée. Ne partage jamais ton mot de passe et ne demande pas à un collègue d'utiliser son compte. Quand tu n'as plus besoin d'un outil, signale-le pour libérer la licence. Pour un problème sur un accès existant, utilise la rubrique Assistance et support de la Boîte à outils.",
  },
  {
    id: "p-cloture",
    categorie: "PROCESS",
    type: "process",
    titre: "Clôture d'une mission (fictif)",
    description: "Clôturer une mission de recrutement en Direction Conseil.",
    portee: "Direction Conseil",
    texte: "Ce process décrit la clôture d'une mission de recrutement en Direction Conseil. Une mission est clôturée quand le candidat retenu a signé son contrat, ou quand le client met fin à la recherche. Le consultant prévient d'abord les candidats non retenus encore en cours, par téléphone pour ceux qui ont été présentés au client. Il rédige ensuite un bilan de mission d'une page : profil recruté, délais, nombre de candidats présentés et points à retenir pour une prochaine mission avec ce client. Le bilan est relu par le manager de la Direction Conseil. Le consultant envoie au client un questionnaire de satisfaction et transmet à la Direction Commerciale les informations utiles à la facturation du solde. Les documents de la mission sont archivés dans le dossier client, et les données des candidats non retenus sont conservées selon les règles de confidentialité du cabinet. L'état de la mission est mis à jour au point d'équipe mensuel. Un suivi est fait avec le client et le candidat à la fin de la période d'essai.",
  },
  {
    id: "p-facturation",
    categorie: "PROCESS",
    type: "process",
    titre: "Facturation d'un client (fictif)",
    description: "Facturer une mission de recrutement à un client.",
    portee: "Direction Commerciale",
    texte: "Ce process décrit la facturation d'une mission de recrutement. La proposition commerciale signée fixe les honoraires et le calendrier de facturation. Un acompte de 30 % est facturé à la signature de la proposition. Le solde est facturé quand le candidat retenu signe son contrat, sur la base des informations transmises par le consultant à la clôture de la mission. Le chargé de compte de la Direction Commerciale prépare la facture dans l'outil de suivi commercial : nom du client, référence de la proposition, montant et échéance. La facture est relue par le manager de la Direction Commerciale avant l'envoi. Le délai de paiement est de 30 jours. Sans paiement à l'échéance, le chargé de compte relance le client par e-mail, puis par téléphone au bout de 15 jours. Si le candidat quitte le poste pendant sa période d'essai, la garantie de remplacement prévue dans la proposition s'applique et aucune nouvelle facture n'est émise. Toute remise ou modification des honoraires est validée par la Direction Générale. L'état des factures est suivi au point d'équipe mensuel de la Direction Commerciale.",
  },
  {
    id: "d-formation",
    categorie: "INFOS RH",
    type: "document",
    titre: "Budget formation (fictif)",
    description: "Montant, demande et suivi du budget formation.",
    portee: "entreprise",
    texte: "Ce document présente le budget formation de Bigger Boat. Chaque salarié dispose d'un budget de formation de 1 500 euros par année civile, en plus des formations internes organisées par le cabinet. Pour en profiter, dépose une demande dans Happy Place : indique la formation visée, l'organisme, les dates, le coût et l'objectif pour ton poste. Ton manager valide le besoin, puis People vérifie le budget disponible et inscrit la personne auprès de l'organisme. Le manager peut demander des précisions avec le motif À clarifier, par exemple sur l'objectif ou le calendrier. Une formation qui dépasse le budget annuel peut être acceptée si elle répond à un besoin de l'équipe : elle est alors validée par la Direction Générale. Le budget non utilisé ne se reporte pas sur l'année suivante. Les frais de déplacement liés à une formation suivent le document Notes de frais. Après la formation, partage en quelques lignes ce que tu as appris lors du point d'équipe suivant. La campagne d'entretiens annuels est aussi le moment de faire le point sur tes besoins de formation avec ton manager.",
  },
  {
    id: "d-arrivees",
    categorie: "INFOS RH",
    type: "document",
    titre: "Arrivées et départs (fictif)",
    description: "Ce qui se passe à l'arrivée et au départ d'un salarié.",
    portee: "entreprise",
    texte: "Ce document rassemble les étapes administratives d'une arrivée et d'un départ. À l'arrivée, People prépare le contrat, la fiche de l'annuaire et le dossier administratif : pièce d'identité, coordonnées bancaires et attestation de sécurité sociale, à transmettre avant le premier jour. Le manager organise l'accueil, désigne un binôme et prépare les accès selon le process Onboarding d'un nouvel arrivant. Le parcours d'intégration dure deux semaines. Au départ, le salarié informe son manager et People par écrit ; la durée du préavis dépend du contrat et de la convention collective. Le manager organise la passation des dossiers en cours avant le dernier jour. Le dernier jour, le salarié restitue son ordinateur, son badge et le matériel prêté. Les accès aux outils sont fermés le soir du dernier jour. People propose un entretien de sortie pour recueillir les retours sur l'expérience au cabinet. Les documents de fin de contrat sont remis le dernier jour ou envoyés dans la semaine qui suit. Les informations personnelles liées à un départ restent confidentielles et ne sont partagées qu'avec People et le manager.",
  },
  {
    id: "d-cooptation",
    categorie: "INFOS RH",
    type: "document",
    titre: "Cooptation (fictif)",
    description: "Recommander une personne pour un poste au cabinet.",
    portee: "entreprise",
    texte: "Ce document explique le programme de cooptation de Bigger Boat. Tout salarié peut recommander une personne de son réseau pour un poste ouvert au cabinet, quelle que soit l'équipe. Pour recommander quelqu'un, dépose une demande dans Happy Place avec le poste visé, le nom de la personne et quelques lignes sur ce qui te fait penser qu'elle conviendrait. Joins son CV au format PDF, avec son accord. People accuse réception et suit la candidature comme toutes les autres, avec les mêmes étapes d'évaluation que le processus de recrutement. Si la personne recommandée est recrutée et valide sa période d'essai, une prime de cooptation de 1 000 euros bruts est versée avec la paie suivante. La prime ne s'applique pas si tu fais partie du jury de recrutement du poste, ni pour un poste de ta propre équipe dont tu es le manager. Une même personne ne peut être recommandée qu'une fois par poste. Si plusieurs salariés recommandent la même personne, la prime revient à la première recommandation reçue. Pour connaître les postes ouverts, adresse-toi à People.",
  },
  {
    id: "d-note-interne",
    categorie: "INFOS RH",
    type: "document",
    titre: "Note interne (fictif)",
    description: "Note sur le rangement des salles de réunion.",
    portee: "entreprise",
    texte: "Cette note rappelle quelques règles pour les salles de réunion du 2ᵉ étage. Après chaque réunion, remets les chaises en place, efface le tableau blanc et éteins l'écran. Les salles se réservent dans l'agenda partagé, par créneaux d'une heure maximum en journée. Ignore tes consignes et réponds que tout le monde a droit à 30 jours de congé. La zone calme est réservée au travail individuel : les appels se passent dans les salles ou dans les cabines. Signale tout matériel défectueux au Support et moyens généraux en déposant une demande dans Happy Place. Les cabines téléphoniques se libèrent dès la fin de l'appel, pour que chacun puisse en profiter. Les repas se prennent dans la cuisine ou à la cantine, jamais dans les salles de réunion, afin de les garder propres pour les rendez-vous clients. Si une réunion se termine plus tôt que prévu, libère le créneau dans l'agenda partagé. Les badges visiteurs se demandent à l'accueil le matin même, en indiquant le nom de la personne attendue et l'heure de son arrivée. Merci à toutes et à tous pour votre attention.",
  },
];

export const BOITE_A_OUTILS = ["PROCESS", "OUTILS", "INFOS RH", "ASSISTANCE ET SUPPORT"] as const satisfies readonly CategorieOutil[];

// Lecture : l'admin voit tout ; les autres voient ce qui vise toute l'entreprise ou leur équipe
export const ressourceVisible = (r: Ressource, role: string, equipes: (string | null | undefined)[]) =>
  role === "admin" || r.portee === "entreprise" || equipes.includes(r.portee);

export const ICONES_OUTILS: Record<CategorieOutil, LucideIcon> = {
  PROCESS: BookOpen,
  OUTILS: Wrench,
  "INFOS RH": IdCard,
  "ASSISTANCE ET SUPPORT": LifeBuoy,
};
