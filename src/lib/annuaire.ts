// Annuaire de démonstration (repris du prototype) : personnes et équipes fictives de Bigger Boat.
// Données statiques : l'annuaire n'est pas encore branché sur la base (voir Journal des modifications V2).

export type RoleAnnuaire = "Collaborateur" | "Manager" | "Admin";
export type Personne = {
  nom: string;
  equipe: string;
  role: RoleAnnuaire;
  priseEnCharge?: boolean; // prend en charge le suivi des blocages
  equipesGerees?: string[]; // équipes encadrées par un manager
};

export const DIRECTION = "Direction Générale";
export const EQUIPES = ["Direction Conseil", "Direction Commerciale", "People", "Support et moyens généraux", DIRECTION];

export const PERSONNES: Personne[] = [
  { nom: "Kesha Diallo", equipe: "Direction Conseil", role: "Manager", equipesGerees: ["Direction Conseil", "Direction Commerciale"] },
  { nom: "Gontran Lefèvre", equipe: "Direction Conseil", role: "Collaborateur" },
  { nom: "Lina Moreau", equipe: "Direction Conseil", role: "Collaborateur" },
  { nom: "Julien Roche", equipe: "Direction Conseil", role: "Collaborateur" },
  { nom: "Inès Garnier", equipe: "Direction Commerciale", role: "Collaborateur" },
  { nom: "Hugo Martin", equipe: "Direction Commerciale", role: "Collaborateur" },
  { nom: "Chloé Lambert", equipe: "Direction Commerciale", role: "Collaborateur" },
  { nom: "Olivia Brun", equipe: "People", role: "Admin" },
  { nom: "Maëlle Fontaine", equipe: "People", role: "Collaborateur" },
  { nom: "Samir Haddad", equipe: "Support et moyens généraux", role: "Manager", priseEnCharge: true },
  { nom: "Yanis Okafor", equipe: "Support et moyens généraux", role: "Collaborateur", priseEnCharge: true },
  { nom: "Arnaud Vidal", equipe: "Direction Générale", role: "Manager" },
];

// Adresse fictive : prenom.nom@bigger-boat.example
export const emailDe = (nom: string) =>
  nom.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/ /g, ".") + "@bigger-boat.example";
