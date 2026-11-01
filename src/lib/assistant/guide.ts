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
      "Happy Place distingue trois profils. Le collaborateur dépose ses demandes, suit les réponses, relance la personne qui décide et lit les actualités, les indicateurs, la Boîte à outils et l'Annuaire ; il ne publie pas d'actualité. Le manager fait tout cela et, en plus, décide des demandes qui lui sont adressées, suit les demandes de son équipe et rédige des actualités pour son équipe ou plusieurs équipes ; pour toute l'entreprise, il demande l'autorisation d'un admin. L'admin supervise toutes les demandes, autorise ou refuse les annonces entreprise, publie directement pour toute l'entreprise, modifie la Boîte à outils et saisit les indicateurs.",
  },
  {
    id: "g-deposer",
    titre: "Déposer une demande : les champs",
    motsCles: ["déposer", "créer", "ajouter", "soumettre", "nouvelle demande", "demande", "formulaire", "champs", "bloquante", "thème", "pièce jointe", "pdf", "brouillon"],
    profils: "tous",
    page: "deposer",
    texte:
      "Pour déposer une demande, ouvre « Déposer une demande » depuis l'accueil ou la page Demandes. Le titre (120 caractères au plus) et la description (1 000 caractères au plus, avec mise en forme) sont obligatoires. La nature est obligatoire. BLOQUANTE : tu ne peux pas poursuivre ton travail tant que la demande n'est pas traitée, par exemple pour un accès à un outil indispensable. NON BLOQUANTE : tu peux continuer à travailler en attendant, par exemple pour un équipement de confort ou une amélioration. Le thème est facultatif : Conditions de travail, Cantine, CE, Informatique ou Autre. Choisis ensuite la visibilité et la personne qui valide, deux choix obligatoires. Tu peux joindre des documents : PDF uniquement, 20 Mo au plus par document, 3 fichiers au plus. Le bouton « Enregistrer le brouillon » garde ta saisie pour plus tard. Tant que la demande est en attente, tu peux encore la modifier, sauf la visibilité et la personne qui valide.",
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
    motsCles: ["superviser", "supervision", "toutes les demandes", "filtrer", "admin", "managers"],
    profils: ["admin"],
    page: "demandes",
    texte:
      "En tant qu'admin, la page Demandes te montre « Toutes les demandes », toutes équipes confondues, dans un tableau paginé par 5. Chaque ligne indique la demande et son auteur, la visibilité, la date de dépôt, le statut et une action ; des filtres par nom, équipe, nature, date et statut sont disponibles, utiles quand tu suis beaucoup de personnes. Les demandes en attente depuis 5 jours ouvrés ou plus, le même seuil que la relance, sont signalées « À traiter ». Seul l'auteur d'une demande peut relancer la personne qui décide : il n'y a pas de rappel groupé. Tu décides aussi des demandes qui te sont adressées avec le choix « L'admin ».",
  },
  {
    id: "g-rediger",
    titre: "Rédiger et publier une actualité",
    motsCles: ["rédiger", "publier", "actualité", "publication", "brouillon", "périmètre", "toute l'entreprise", "autorisation", "photos"],
    profils: ["manager"],
    page: "rediger",
    texte:
      "En tant que manager, ouvre « Rédiger une actualité » depuis la page Actualités. Choisis le périmètre : Mon équipe ou Plusieurs équipes, tu publies directement ; Toute l'entreprise, tu demandes l'autorisation d'un admin : le bouton devient « Demander l'accord ». Le titre fait 120 caractères au plus. Tu peux ajouter jusqu'à 3 photos (2 Mo au plus chacune, avec l'accord des personnes photographiées) et jusqu'à 4 PDF de 20 Mo au plus. Le brouillon s'enregistre automatiquement pendant la saisie. Tes publications passent par les statuts Brouillon, En attente d'accord, Autorisée, Publiée ou Refusée ; tu les suis dans l'onglet « Mes publications ». Une annonce autorisée par un admin, tu la publies toi-même.",
  },
  {
    id: "g-annonce-entreprise",
    titre: "Publier et autoriser les annonces entreprise",
    motsCles: ["publier", "annonce", "entreprise", "autoriser", "autorise", "autorisation", "à autoriser", "règle de publication", "actualité", "rédiger", "qui"],
    profils: ["admin"],
    page: "actualites",
    texte:
      "En tant qu'admin, tu publies directement une actualité pour toute l'entreprise avec « Rédiger une actualité ». Tu reçois aussi les demandes d'autorisation des managers : l'onglet « À autoriser » les présente en cartes, avec les boutons Autoriser et Refuser ; un refus demande une explication, que l'auteur voit dans ses publications. Une annonce autorisée est ensuite publiée par son auteur. L'onglet « Suivi des publications » liste les annonces entreprise et tes propres publications, par statut : En attente d'accord, Autorisée, Publiée, Refusée.",
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
      "La Boîte à outils rassemble les ressources utiles, en quatre catégories : Process, Outils, Infos RH, Assistance et support. Une ressource peut être un process ou un document à lire dans Happy Place, une page de l'outil, un lien externe ou un PDF. Un champ de recherche filtre les ressources. Chaque ressource a une portée : toute l'entreprise ou une équipe ; tu ne vois que celles de l'entreprise et de ton équipe.",
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
    id: "g-connexion",
    titre: "Se connecter et premier accès",
    motsCles: ["connexion", "connecter", "login", "mot de passe", "compte", "accès", "liste blanche", "e-mail", "lien magique", "bloqué", "pas d'accès"],
    profils: "tous",
    page: "",
    texte:
      "Pour entrer dans Happy Place, utilise l'adresse e-mail que l'admin a ajoutée à la liste des personnes autorisées. Tu te connectes avec ton mot de passe ou avec un lien de connexion reçu par e-mail. Si ton adresse n'est pas dans la liste, tu n'as pas accès : demande à un admin de t'ajouter. Ton rôle (Collaborateur, Manager ou Admin) et ton équipe sont définis par l'admin et déterminent ce que tu vois : le menu, les demandes à valider, la rédaction d'actualités. Si tu n'as pas d'équipe, tu ne peux pas déposer de demande : préviens un admin.",
  },
  {
    id: "g-valider-admin",
    titre: "Admin : décider des demandes adressées à l'admin",
    motsCles: ["admin", "valider", "refuser", "demande entreprise", "à valider", "décider", "fonctionnement de l'entreprise", "filtrer"],
    profils: ["admin"],
    page: "demandes",
    texte:
      "Quand un collaborateur ou un manager choisit « L'admin » comme personne qui valide, la demande arrive dans « Demandes à valider » chez les admins. Ouvre-la, lis le contenu, puis clique sur « Valider la demande » ou « Refuser avec motif ». Les quatre motifs de refus sont À clarifier (de 1 à 5 questions, la demande repart chez l'auteur), En désaccord avec les process, Doublon et Autre (définitifs). Pour une demande bloquante validée, tu peux suivre le blocage (Ouvert, En cours, Résolu), indiquer qui la prend en charge et une date cible. Les listes se filtrent par nom, équipe, date, nature et statut.",
  },
  {
    id: "g-publications",
    titre: "Suivre et reprendre ses publications (manager)",
    motsCles: ["mes publications", "brouillon", "reprendre", "corriger", "redemander", "publier", "autorisée", "refusée", "en attente d'accord", "statut"],
    profils: ["manager"],
    page: "actualites",
    texte:
      "L'onglet « Mes publications » de la page Actualités liste toutes tes publications, avec des onglets par statut (Brouillon, En attente d'accord, Autorisée, Publiée, Refusée), une recherche et un tri. Selon le statut, l'action change : Reprendre un brouillon, Demander l'accord pour une annonce entreprise, Publier une annonce autorisée, Corriger puis Redemander l'accord après un refus ; le motif du refus s'affiche sous la publication. Une annonce en attente depuis plusieurs jours peut faire l'objet d'un rappel affiché en bandeau. Le menu Actualités affiche un compteur quand une de tes annonces est autorisée et attend ta publication.",
  },
  {
    id: "g-assistant",
    titre: "L'Assistant IA : ce qu'il sait et ses limites",
    motsCles: ["assistant", "ia", "intelligence artificielle", "question", "aide", "chatbot", "réponse", "sources", "mode sans ia"],
    profils: "tous",
    page: "",
    texte:
      "L'Assistant IA répond à tes questions sur Happy Place : comment faire une demande, qui valide, comment rédiger une actualité, où trouver un process. Il comprend les mots-clés et les questions formulées autrement, et te pose une question de précision quand ta demande est vague. Il répond uniquement à partir des contenus que tu as le droit de lire (ce guide, les actualités publiées, les process et documents de la Boîte à outils) et indique ses sources. Il ne lit jamais les demandes ni leurs pièces jointes et ne décide rien sur une personne. Ne saisis pas de données personnelles. Ses réponses peuvent être incomplètes : vérifie dans la source. Si l'IA est indisponible, il affiche le meilleur extrait trouvé, avec la mention « sans IA ».",
  },
  {
    id: "g-glossaire",
    titre: "Mots utilisés dans Happy Place (glossaire)",
    motsCles: ["glossaire", "vocabulaire", "définition", "veut dire", "signifie", "terme", "sens", "demande", "requête", "ticket", "besoin", "idée", "remontée", "valideur", "bloquante", "annonce", "actualité", "brouillon", "visibilité", "périmètre"],
    profils: "tous",
    page: "",
    texte:
      "Une demande est ce que le terrain dépose : une demande, une idée, un besoin ou un point qui bloque le travail (on dit aussi requête ou remontée). La nature d'une demande est Bloquante (tu ne peux plus avancer sans réponse) ou Non bloquante. La personne qui valide, ou qui décide, est le manager ou l'admin choisi au dépôt. La visibilité dit qui voit la demande : Tous, Mon équipe ou Mon manager uniquement. Une actualité, ou annonce, est un contenu publié pour l'entreprise ou pour des équipes ; le périmètre dit qui la voit. Autoriser est le rôle de l'admin pour une annonce Toute l'entreprise. Un brouillon est une saisie enregistrée mais pas envoyée. À compléter est l'état d'une demande refusée avec le motif « À clarifier ». Relancer, c'est rappeler la personne qui décide après 5 jours ouvrés. Un indicateur est un chiffre clé saisi par l'admin. La liste blanche est la liste des personnes autorisées à se connecter.",
  },
  {
    id: "g-admin-acces",
    titre: "Admin : où gérer les équipes et les utilisateurs",
    motsCles: ["admin", "gestion", "gérer", "équipes", "utilisateurs", "liste blanche", "accès", "où"],
    profils: ["admin"],
    page: "manage/users",
    texte:
      "En tant qu'admin, tu gères les équipes et les personnes autorisées dans le menu « Gestion des données », onglet « Équipes et utilisateurs ». Seules les personnes présentes dans cette liste blanche peuvent se connecter à Happy Place. Cette page permet de créer et modifier les équipes, d'ajouter des utilisateurs, de leur donner un rôle et une équipe, d'attribuer des équipes à un manager, de modifier un nom et de programmer un départ. Les onglets voisins, Actualités et Soumissions, servent à gérer les contenus.",
  },
  {
    id: "g-admin-equipes",
    titre: "Admin : créer, renommer ou supprimer une équipe",
    motsCles: ["admin", "équipe", "équipes", "créer une équipe", "nouvelle équipe", "renommer", "supprimer une équipe", "ajouter une équipe"],
    profils: ["admin"],
    page: "manage/users",
    texte:
      "Pour créer une équipe, ouvre Gestion des données puis Équipes et utilisateurs, va dans la section Équipes, saisis le nom de la nouvelle équipe et clique sur Ajouter. Un nom déjà utilisé est refusé. Pour renommer une équipe, utilise l'action Renommer à côté de son nom. Pour supprimer une équipe, utilise l'action Supprimer : c'est refusé tant que des personnes ou des demandes y sont encore rattachées, il faut d'abord les réaffecter à une autre équipe. L'équipe Admin est réservée aux admins et ne peut pas être attribuée à un collaborateur ou à un manager.",
  },
  {
    id: "g-admin-utilisateur",
    titre: "Admin : ajouter un utilisateur à la liste blanche",
    motsCles: ["admin", "ajouter", "créer", "utilisateur", "nouveau", "nouveau collaborateur", "liste blanche", "accès", "arrivée", "import", "e-mail"],
    profils: ["admin"],
    page: "manage/users",
    texte:
      "Quand une nouvelle personne arrive, ajoute-la à la liste blanche pour qu'elle puisse se connecter. Ouvre Gestion des données puis Équipes et utilisateurs, remplis le formulaire en haut : prénom et nom (facultatifs), adresse e-mail Google, rôle (Collaborateur, Manager ou Admin) et équipe, puis clique sur Ajouter. L'équipe est obligatoire pour un collaborateur et pour un manager ; elle n'est pas demandée pour un admin. Une adresse déjà présente est refusée. Pour ajouter plusieurs personnes d'un coup, utilise l'import en masse avec le modèle de fichier proposé, qui vérifie les lignes avant d'importer. Pour modifier un prénom ou un nom, utilise la ligne NOM de la personne. L'adresse e-mail ne se modifie pas : pour la changer, retire la personne puis ajoute-la avec la nouvelle adresse.",
  },
  {
    id: "g-admin-collaborateur-equipe",
    titre: "Admin : rattacher ou changer l'équipe d'un collaborateur",
    motsCles: ["admin", "collaborateur", "équipe", "changer d'équipe", "rattacher", "affecter", "muter", "attribuer"],
    profils: ["admin"],
    page: "manage/users",
    texte:
      "Chaque collaborateur appartient à une seule équipe. Pour la changer, ouvre Gestion des données puis Équipes et utilisateurs, trouve la personne avec la recherche ou le filtre Équipe, choisis la nouvelle équipe dans la ligne ÉQUIPE et clique sur Enregistrer. Un collaborateur sans équipe ne peut pas déposer de demande : l'écran affiche « Aucune équipe définie ». Pour passer quelqu'un de manager à collaborateur, ou l'inverse, change son rôle dans la liste et choisis son équipe dans la fenêtre qui s'ouvre.",
  },
  {
    id: "g-admin-manager",
    titre: "Admin : attribuer des équipes à un manager",
    motsCles: ["admin", "manager", "équipes", "attribuer", "encadrer", "gérer", "rattachement", "équipe de rattachement", "obligatoire"],
    profils: ["admin"],
    page: "manage/users",
    texte:
      "Chaque manager doit avoir une équipe de rattachement : la base refuse de donner le rôle manager à quelqu'un qui n'a pas d'équipe. Quand tu crées un manager ou que tu passes quelqu'un manager, choisis cette équipe ; elle est automatiquement comptée parmi les équipes qu'il encadre. Un manager peut encadrer plusieurs équipes et une équipe peut avoir plusieurs managers. Pour lui attribuer une équipe de plus, ouvre sa ligne dans Équipes et utilisateurs, choisis l'équipe dans la liste de la ligne ÉQUIPES et clique sur Ajouter. Pour en retirer une, clique sur la croix à côté de son nom. Le manager décide ensuite des demandes de toutes les équipes qu'il encadre et peut rédiger des actualités pour elles. Pour changer son équipe de rattachement, utilise la ligne ÉQUIPE DE RATTACHEMENT.",
  },
  {
    id: "g-admin-filtres",
    titre: "Admin : filtrer par équipe, nom ou date",
    motsCles: ["admin", "filtrer", "filtres", "rechercher", "nom", "équipe", "date", "trier", "beaucoup de personnes"],
    profils: ["admin"],
    page: "demandes",
    texte:
      "Comme tu suis beaucoup de personnes, les listes se filtrent. Dans « Demandes à valider » et « Toutes les demandes », recherche un nom, un titre ou une référence, puis filtre par équipe, nature (bloquante ou non), date (7, 30 ou 90 derniers jours) et statut ; le bouton Réinitialiser les filtres remet tout à zéro. Dans Actualités, l'onglet À autoriser et l'onglet Suivi se filtrent par auteur, titre, équipe de l'auteur et date. Dans Équipes et utilisateurs, la liste se filtre par nom ou e-mail, équipe et rôle. Un auteur d'identité confidentielle ne se retrouve pas par son nom dans les listes de lecture.",
  },
  {
    id: "g-admin-depart",
    titre: "Admin : retirer l'accès d'une personne qui part",
    motsCles: ["admin", "départ", "retirer", "supprimer", "accès", "quitter", "documents", "pièces jointes"],
    profils: ["admin"],
    page: "manage/users",
    texte:
      "Pour retirer l'accès d'une personne, utilise Retirer (J+7) sur sa ligne, ou choisis une date dans Départ prévu le (au moins 7 jours plus tard). Son manager et les admins sont prévenus tout de suite et peuvent télécharger ses documents d'ici là. Tu peux annuler le départ avant la date. Au moment du retrait, ses demandes restent mais son nom devient « Utilisateur supprimé », et tous les fichiers qu'elle avait joints (jusqu'à 3 par demande) sont mis en file de suppression. Si des documents restent en attente de suppression, un encadré en haut de la page propose de réessayer.",
  },
  {
    id: "g-admin-autoriser",
    titre: "Admin : autoriser ou refuser une annonce entreprise",
    motsCles: ["admin", "autoriser", "refuser", "annonce", "actualité", "entreprise", "à autoriser", "motif", "manager"],
    profils: ["admin"],
    page: "actualites",
    texte:
      "Quand un manager veut publier pour toute l'entreprise, il demande ton accord. Les annonces en attente sont dans Actualités, onglet À autoriser, avec un compteur dans le menu. Lis l'aperçu complet, puis clique sur Autoriser ou sur Refuser avec motif : le motif est obligatoire et il est transmis au manager. Une annonce autorisée peut ensuite être publiée par son auteur. L'onglet Suivi regroupe toutes les annonces entreprise par statut : à autoriser, autorisées à publier, publiées, refusées. En tant qu'admin, tu publies toi-même directement pour toute l'entreprise.",
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
