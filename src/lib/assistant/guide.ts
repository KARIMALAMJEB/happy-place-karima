export type ProfilId = "collaborateur" | "manager" | "admin";

// Guide Happy Place : fonctionnement de l'outil, écrit d'après le comportement réel du prototype.
// Aucun nom de personne ni aucune donnée de demande de la démo. Cherché par l'Assistant IA (type « Guide »).
export interface ArticleGuide {
  id: string;
  titre: string;
  motsCles: string[];
  profils: ProfilId[] | "tous";
  page: string; // chemin dans l'application (« » = accueil)
  texte: string;
}

export const GUIDE: ArticleGuide[] = [
  {
    id: "g-happy-place",
    titre: "À quoi sert Happy Place",
    motsCles: ["outil", "tableau de bord", "accueil", "pilotage", "sert"],
    profils: "tous",
    page: "",
    texte:
      "Happy Place est le tableau de bord interne de Bigger Boat. C'est un outil de pilotage, pas une messagerie : on y suit ce qui demande une action, sans conversation. L'accueil affiche un tableau de bord compact de tes demandes, les actualités de l'entreprise et de ton équipe, les indicateurs clés et la Boîte à outils. Le collaborateur y dépose et suit ses demandes. Le manager y décide des demandes de son équipe et publie des actualités. L'admin supervise toutes les demandes, autorise les annonces pour toute l'entreprise, tient la Boîte à outils et saisit les indicateurs. Le menu donne accès au Tableau de bord, aux Actualités, aux Demandes, aux Indicateurs, à la Boîte à outils et à l'Annuaire.",
  },
  {
    id: "g-profils",
    titre: "Les 3 profils : Collaborateur, Manager, Admin",
    motsCles: ["profil", "profils", "collaborateur", "manager", "admin", "droits", "rôle"],
    profils: "tous",
    page: "",
    texte:
      "Happy Place distingue trois profils. Le collaborateur dépose ses demandes, suit les réponses, relance la personne qui décide et lit les actualités, les indicateurs, la Boîte à outils et l'Annuaire ; il ne publie pas d'actualité. Le manager fait tout cela et, en plus, décide des demandes qui lui sont adressées, suit les demandes de son équipe et rédige des actualités pour son équipe ou plusieurs équipes ; pour toute l'entreprise, il demande l'autorisation d'un admin. L'admin supervise toutes les demandes, envoie un rappel groupé aux managers, autorise ou refuse les annonces entreprise, publie directement pour toute l'entreprise, modifie la Boîte à outils et saisit les indicateurs.",
  },
  {
    id: "g-deposer",
    titre: "Déposer une demande : les champs",
    motsCles: ["déposer", "demande", "formulaire", "champs", "bloquante", "thème", "pièce jointe", "pdf", "brouillon"],
    profils: "tous",
    page: "deposer",
    texte:
      "Pour déposer une demande, ouvre « Déposer une demande » depuis l'accueil ou la page Demandes. Le titre (120 caractères au plus) et la description (1 000 caractères au plus, avec mise en forme) sont obligatoires. La nature est obligatoire. BLOQUANTE : tu ne peux pas poursuivre ton travail tant que la demande n'est pas traitée, par exemple pour un accès à un outil indispensable. NON BLOQUANTE : tu peux continuer à travailler en attendant, par exemple pour un équipement de confort ou une amélioration. Le thème est facultatif : Conditions de travail, Cantine, CE, Informatique ou Autre. Choisis ensuite la visibilité et la personne qui valide, deux choix obligatoires. Tu peux joindre des documents : PDF uniquement, 20 Mo au plus par document, 4 fichiers au plus. Le bouton « Enregistrer le brouillon » garde ta saisie pour plus tard. Tant que la demande est en attente, tu peux encore la modifier, sauf la visibilité et la personne qui valide.",
  },
  {
    id: "g-visibilite",
    titre: "Visibilité, qui décide et identité confidentielle",
    motsCles: ["visibilité", "valideur", "valide", "qui valide", "confidentiel", "identité", "mon manager", "admin"],
    profils: "tous",
    page: "deposer",
    texte:
      "Au dépôt, la visibilité dit qui voit ta demande : Tous (tous les salariés), Mon équipe (les membres de ton équipe) ou Mon manager uniquement (seule la personne qui valide). La question « Qui valide cette demande ? » dit qui décide : Mon manager, pour un sujet de travail au quotidien, ou L'admin, pour un sujet de fonctionnement de l'entreprise. Si ton équipe n'a pas de manager, ce choix est indisponible ; l'admin, elle, fait passer ses propres demandes par son manager. L'option « Identité confidentielle » masque ton nom : les autres lecteurs voient « Auteur confidentiel », seule la personne qui décide voit ton nom et elle est tenue à la confidentialité. Tu reçois toujours la réponse par e-mail.",
  },
  {
    id: "g-bloquante",
    titre: "Demande bloquante ou non bloquante, et suivi du blocage",
    motsCles: ["bloquante", "non bloquante", "nature", "blocage", "suivi", "prend en charge", "date cible", "urgent"],
    profils: "tous",
    page: "deposer",
    texte:
      "Au dépôt, la nature d'une demande est obligatoire et aucun choix n'est présélectionné. Une demande est BLOQUANTE quand tu ne peux pas poursuivre ton travail tant qu'elle n'est pas traitée, par exemple pour un accès à un outil indispensable. Elle est NON BLOQUANTE quand tu peux continuer à travailler en attendant, par exemple pour un équipement de confort ou une amélioration. Une demande bloquante est signalée par le mot BLOQUANTE. Tant qu'elle n'est pas validée, elle n'affiche que son statut de décision. Après validation, un suivi du blocage s'ouvre avec trois étapes, OUVERT, EN COURS puis RÉSOLU, sans passage direct d'OUVERT à RÉSOLU ; il indique la personne qui prend en charge et la date cible. Tant que la demande est en attente, son auteur peut encore changer sa nature avec le lien « Modifier ».",
  },
  {
    id: "g-apres-envoi",
    titre: "Après l'envoi d'une demande",
    motsCles: ["après", "envoi", "statut", "en attente", "validée", "refusée", "à compléter", "e-mail", "délai", "réponse"],
    profils: "tous",
    page: "demandes",
    texte:
      "Après l'envoi, ta demande passe à l'état En attente et la personne qui valide la reçoit. Elle prend ensuite une décision : Validée, Refusée ou À compléter. Tu es prévenu par e-mail en moins de 5 minutes, avec le motif et l'explication en cas de refus. Dans la démo (fictif), les e-mails sont simulés : un message s'affiche à l'écran à chaque envoi. Tu suis tes demandes dans Mes demandes, avec des filtres par statut ; sur l'accueil, les onglets En cours, Réponses reçues et Terminées les regroupent, et une réponse non lue est signalée par le libellé « Réponse non lue ». Pour une demande bloquante, le suivi du blocage n'apparaît qu'après la validation : OUVERT, EN COURS puis RÉSOLU, sans passage direct d'OUVERT à RÉSOLU.",
  },
  {
    id: "g-refus",
    titre: "Refus et « À clarifier » : compléter sa demande",
    motsCles: ["refus", "refuse", "motif", "à clarifier", "clarifier", "compléter", "renvoyer", "définitif", "doublon", "désaccord"],
    profils: "tous",
    page: "demandes",
    texte:
      "Un refus porte toujours un motif et une explication. Il existe quatre motifs. « À clarifier » signifie qu'il manque des informations : le manager pose de 1 à 5 questions et ta demande passe à l'état À compléter. Tu ouvres alors « Compléter ma demande », tu réponds à chaque précision demandée, tu peux ajouter des informations et des PDF, puis tu cliques sur « Renvoyer ma demande » : elle repasse En attente chez la même personne, avec la même visibilité. Les trois autres motifs sont définitifs : « En désaccord avec les process », « Doublon » et « Autre ». La demande est alors en lecture seule et ne peut plus être renvoyée ; si ton besoin évolue, dépose une nouvelle demande.",
  },
  {
    id: "g-relance",
    titre: "Relancer la personne qui décide",
    motsCles: ["relancer", "relance", "rappel", "jours", "jours ouvrés", "temps", "délai", "sans réponse", "attente"],
    profils: "tous",
    page: "demandes",
    texte:
      "Sans réponse après 5 jours ouvrés (du lundi au vendredi), tu peux relancer la personne qui décide depuis Mes demandes, avec le bouton « Relancer » d'une demande en attente. Avant ce délai, le bouton est remplacé par « Relance possible dans » suivi du nombre de jours ouvrés restants. Une fois la relance faite, la demande affiche « Relance envoyée » et la personne qui décide reçoit un e-mail de relance. Une demande en attente depuis 5 jours ouvrés ou plus est signalée « À traiter » : c'est le même seuil que la relance.",
  },
  {
    id: "g-equipe",
    titre: "Décider des demandes de son équipe",
    motsCles: ["décider", "valider", "refuser", "à valider", "équipe", "manager", "traiter", "urgent"],
    profils: ["manager"],
    page: "demandes",
    texte:
      "En tant que manager, tu retrouves les demandes qui t'attendent dans « Demandes à valider : mon équipe », sur l'accueil et sur la page Demandes. Si tu gères plusieurs équipes, le filtre « Équipe » te permet de choisir l'équipe pour laquelle tu décides. Le tableau signale « À traiter » une demande en attente depuis 5 jours ouvrés ou plus, et une tuile compte celles à traiter d'urgence. C'est aussi à partir de 5 jours ouvrés que l'auteur peut te relancer. Ouvre une demande pour la lire : tu peux la valider avec « Valider la demande » ou la refuser avec un motif. Le refus « À clarifier » demande de 1 à 5 précisions à l'auteur ; les autres motifs sont définitifs. L'explication que tu écris figure dans l'e-mail envoyé à l'auteur ; si son identité est confidentielle, ne la cite pas. Quand l'auteur renvoie une demande complétée, ses réponses s'affichent sous chaque précision.",
  },
  {
    id: "g-supervision",
    titre: "Superviser toutes les demandes",
    motsCles: ["superviser", "supervision", "toutes les demandes", "rappel groupé", "admin", "managers"],
    profils: ["admin"],
    page: "demandes",
    texte:
      "En tant qu'admin, la page Demandes te montre « Toutes les demandes », toutes équipes confondues, dans un tableau paginé par 5. Chaque ligne indique la demande et son auteur, la visibilité, la date de dépôt, le statut et une action ; des filtres par équipe, nature et statut sont disponibles. Les demandes en attente depuis 5 jours ouvrés ou plus, le même seuil que la relance, sont signalées « À traiter ». Le bouton « Envoyer le rappel groupé » prévient en une fois, après confirmation, chaque manager concerné. Tu décides aussi des demandes qui te sont adressées avec le choix « L'admin ».",
  },
  {
    id: "g-rediger",
    titre: "Rédiger et publier une actualité",
    motsCles: ["rédiger", "publier", "actualité", "publication", "brouillon", "périmètre", "toute l'entreprise", "autorisation", "photos"],
    profils: ["manager"],
    page: "rediger",
    texte:
      "En tant que manager, ouvre « Rédiger une actualité » depuis la page Actualités. Choisis le périmètre : Mon équipe ou Plusieurs équipes, tu publies directement ; Toute l'entreprise, tu demandes l'autorisation d'un admin : le bouton devient « Demander l'accord ». Le titre fait 120 caractères au plus. Tu peux ajouter jusqu'à 3 photos (2 Mo au plus chacune, avec l'accord des personnes photographiées) et jusqu'à 4 PDF de 20 Mo au plus. Le brouillon s'enregistre automatiquement pendant la saisie. Tes publications passent par les statuts Brouillon, En attente d'accord, Autorisée, Publiée ou Refusée ; une publication peut aussi avoir le statut Archivée ; tu les suis dans l'onglet « Mes publications ». Une annonce autorisée par un admin, tu la publies toi-même.",
  },
  {
    id: "g-annonce-entreprise",
    titre: "Publier et autoriser les annonces entreprise",
    motsCles: ["publier", "annonce", "entreprise", "autoriser", "autorise", "autorisation", "à autoriser", "règle de publication", "actualité", "rédiger", "qui"],
    profils: ["admin"],
    page: "actualites",
    texte:
      "En tant qu'admin, tu publies directement une actualité pour toute l'entreprise avec « Rédiger une actualité ». Tu reçois aussi les demandes d'autorisation des managers : l'onglet « À autoriser » les présente en cartes, avec les boutons Autoriser et Refuser ; un refus demande une explication, que l'auteur voit dans ses publications. Une annonce autorisée est ensuite publiée par son auteur. L'onglet « Suivi des publications » liste les annonces entreprise et tes propres publications, par statut : En attente d'accord, Autorisée, Publiée, Refusée. Le bouton « Règle de publication » te permet de modifier le texte de la règle affichée aux managers.",
  },
  {
    id: "g-proposer",
    titre: "Proposer une actualité ou une annonce quand on est collaborateur",
    motsCles: ["publier", "proposer", "actualité", "publication", "rédiger", "collaborateur", "annonce", "autoriser"],
    profils: ["collaborateur"],
    page: "actualites",
    texte:
      "En tant que collaborateur, tu consultes les actualités de ton équipe et de l'entreprise, en lecture seule : tu ne rédiges pas et ne publies pas d'actualité dans Happy Place. En haut du fil, le bandeau « Information droits de publication (lecture seule) » te le rappelle. Pour proposer une publication, adresse-toi à ton manager ou à un admin. Ton manager publie seul pour son équipe ou pour plusieurs équipes ; pour toute l'entreprise, la publication passe par l'autorisation d'un admin : c'est un admin qui autorise une annonce pour toute l'entreprise. Les actualités publiées apparaissent dans le fil d'actualités et dans le carrousel de l'accueil.",
  },
  {
    id: "g-fil",
    titre: "Le fil d'actualités",
    motsCles: ["fil", "actualités", "onglets", "mon équipe", "entreprise", "recherche", "filtres", "carrousel"],
    profils: "tous",
    page: "actualites",
    texte:
      "La page Actualités ouvre sur le fil d'actualités publiées. Trois onglets le découpent : Toutes, Mon équipe et Entreprise, chacun avec son nombre d'actualités. Un champ « Rechercher une actualité » cherche dans le titre, le texte et l'auteur. Le bouton des filtres permet de filtrer par auteur, par équipe, par thème et par date ; chaque filtre actif s'affiche en pastille que tu peux retirer. Sur l'accueil, le carrousel des actualités défile toutes les 6 secondes, avec un bouton pour le mettre en pause, des flèches et les onglets Entreprise et Mon équipe. Chaque actualité s'ouvre en page complète.",
  },
  {
    id: "g-indicateurs",
    titre: "Les indicateurs",
    motsCles: ["indicateurs", "indicateur", "effectif", "mandats", "objectif", "mise à jour", "saisie", "performance"],
    profils: "tous",
    page: "indicateurs",
    texte:
      "Les indicateurs montrent la performance de l'entreprise. Trois indicateurs sont affichés : Effectif, Mandats actifs et Objectif annuel atteint, chacun avec sa valeur, son unité et sa période. Ils sont saisis à la main par l'admin, dans l'écran Indicateurs, et s'affichent sur le tableau de bord de tous les collaborateurs ; les tuiles de l'accueil mènent à cet écran. La mention « Mis à jour le … par … », sous « Indicateurs clés », donne la date de la dernière saisie et la personne qui l'a faite. Si cette date dépasse 30 jours, l'admin voit le repère « Mise à jour à faire ». L'admin peut ajouter ou supprimer un indicateur, puis cliquer sur « Enregistrer et publier » ; un aperçu montre le rendu côté collaborateur.",
  },
  {
    id: "g-outils",
    titre: "La Boîte à outils",
    motsCles: ["boîte à outils", "outils", "process", "infos rh", "assistance", "support", "documents", "ressources"],
    profils: "tous",
    page: "boite-a-outils",
    texte:
      "La Boîte à outils rassemble les ressources utiles, en quatre catégories : Process, Outils, Infos RH, Assistance et support. Une ressource peut être un process ou un document à lire dans Happy Place, une page de l'outil, un lien externe ou un PDF. Un champ de recherche filtre les ressources. Chaque ressource a une portée : toute l'entreprise ou une équipe ; tu ne vois que celles de l'entreprise et de ton équipe. Seul l'admin peut ajouter, modifier ou supprimer une ressource et choisir sa portée.",
  },
  {
    id: "g-annuaire",
    titre: "L'Annuaire",
    motsCles: ["annuaire", "organigramme", "liste", "contact", "équipe", "trouver", "personne", "interlocuteur"],
    profils: "tous",
    page: "annuaire",
    texte:
      "L'Annuaire sert à trouver la bonne personne et son équipe. Il propose deux affichages : l'organigramme, avec la Direction Générale puis une carte par équipe où le manager est mis en avant, et la liste, avec le nom, le rôle, l'équipe et un bouton « Envoyer un e-mail ». Quand un manager a sa fiche dans une autre équipe, la carte de l'équipe qu'il gère le rappelle sans dupliquer sa fiche. Le champ de recherche accepte un nom, une équipe ou un rôle. Dans la démo (fictif), les personnes et les adresses e-mail sont fictives.",
  },
  {
    id: "g-parcours",
    titre: "Comment les pages s'enchaînent",
    motsCles: ["parcours", "pages", "enchaînent", "accueil", "étapes", "navigation"],
    profils: "tous",
    page: "",
    texte:
      "Tout part de l'accueil. Le bouton « Déposer une demande » ouvre le formulaire ; une fois envoyée, la demande apparaît dans Mes demandes et chez la personne qui valide. Celle-ci l'ouvre depuis « À valider » ou depuis la page Demandes, puis la valide ou la refuse avec un motif. Sans réponse après 5 jours ouvrés, l'auteur peut relancer depuis Mes demandes. La décision part par e-mail à l'auteur en moins de 5 minutes ; avec « À clarifier », l'e-mail et la demande mènent à « Compléter ma demande ». Chaque ligne de demande, sur l'accueil comme sur la page Demandes, ouvre le détail de la demande. Depuis l'accueil, les tuiles d'indicateurs mènent à l'écran Indicateurs et le carrousel aux actualités.",
  },
  {
    id: "g-donnees",
    titre: "Protection des données",
    motsCles: ["données", "personnelles", "rgpd", "confidentialité", "confidentiel", "qui voit", "assistant", "ia"],
    profils: "tous",
    page: "/confidentialite",
    texte:
      "Happy Place limite qui voit quoi. Une demande est visible selon la visibilité choisie au dépôt : Tous, Mon équipe ou Mon manager uniquement. Avec l'identité confidentielle, les autres lecteurs voient « Auteur confidentiel » et seule la personne qui décide voit le nom. L'Assistant IA ne cherche que dans les contenus que tu as le droit de lire : actualités publiées, process et documents de la Boîte à outils et ce guide ; il ne lit jamais les demandes ni leurs pièces jointes. Ne saisis pas de données personnelles dans ta question : une question qui contient un e-mail, un numéro de téléphone ou un numéro à 13 chiffres est refusée. La page Confidentialité détaille les données traitées, leur conservation et tes droits.",
  },
];
