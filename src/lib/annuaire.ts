// Annuaire de démonstration : personnes et équipes fictives de Bigger Boat, alignées sur les comptes de la base (liste blanche, rôles, équipes gérées).
// Données statiques : l'annuaire n'est pas encore branché sur la base. À mettre à jour à la main quand les comptes changent.

export type RoleAnnuaire = "Collaborateur" | "Manager" | "Admin";
export type Personne = {
  nom: string;
  equipe: string;
  role: RoleAnnuaire;
  priseEnCharge?: boolean; // prend en charge le suivi des blocages
  equipesGerees?: string[]; // équipes encadrées par un manager
};

export const DIRECTION = "Administration";
export const EQUIPES = ["Direction Commerciale", "Finance", "Marketing", "People", "Pôle Data et IA", "Product", DIRECTION];

export const PERSONNES: Personne[] = [
  { nom: "Olivia Brun", equipe: DIRECTION, role: "Admin" },
  { nom: "Claire Vasseur", equipe: DIRECTION, role: "Admin" },
  { nom: "Maëlle Fontaine", equipe: "Direction Commerciale", role: "Manager", equipesGerees: ["Direction Commerciale"] },
  { nom: "Karim Haddad", equipe: "Direction Commerciale", role: "Manager", equipesGerees: ["Direction Commerciale", "Marketing"] },
  { nom: "Sofia Benali", equipe: "Direction Commerciale", role: "Collaborateur" },
  { nom: "Thomas Diallo", equipe: "Direction Commerciale", role: "Collaborateur" },
  { nom: "Lina Moreau", equipe: "Direction Commerciale", role: "Collaborateur" },
  { nom: "Yanis Okafor", equipe: "Finance", role: "Manager", equipesGerees: ["Finance"] },
  { nom: "Julien Caron", equipe: "Marketing", role: "Collaborateur" },
  { nom: "Kesha Diallo", equipe: "People", role: "Manager", equipesGerees: ["People", "Direction Commerciale"] },
  { nom: "Julie Moreau", equipe: "People", role: "Manager", equipesGerees: ["People", "Pôle Data et IA"] },
  { nom: "Gontran Lefèvre", equipe: "People", role: "Collaborateur" },
  { nom: "Hugo Martin", equipe: "People", role: "Collaborateur" },
  { nom: "Léa Bernard", equipe: "Pôle Data et IA", role: "Collaborateur" },
  { nom: "Sophie Marchand", equipe: "Product", role: "Manager", equipesGerees: ["Product"] },
  { nom: "Nina Petit", equipe: "Product", role: "Collaborateur" },
];

// Adresse fictive : prenom.nom@bigger-boat.example
export const emailDe = (nom: string) =>
  nom.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/ /g, ".") + "@bigger-boat.example";
