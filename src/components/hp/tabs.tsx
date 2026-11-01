import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Onglets de la charte V2 (portés du prototype) : flèches gauche/droite pour passer d'un onglet à l'autre
export function TabButton({
  active,
  onClick,
  children,
  grand,
  controle,
}: {
  active?: boolean;
  onClick?: () => void;
  children: string;
  grand?: boolean;
  controle?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={!!active}
      aria-controls={controle}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center whitespace-nowrap",
        grand ? "label-13 h-12 border-b-[3px] px-5" : "label h-11 border-b-2 px-4",
        active ? "border-b-anthracite bg-neutral-1 text-anthracite" : "border-b-transparent bg-transparent text-ink-2 hover:text-anthracite",
      )}
    >
      {children}
    </button>
  );
}

export function TabList({ label, children }: { label: string; children: ReactNode }) {
  const clavier = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const onglets = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")];
    const i = onglets.indexOf(document.activeElement as HTMLButtonElement);
    const cible = onglets[(i + (e.key === "ArrowRight" ? 1 : -1) + onglets.length) % onglets.length];
    cible?.focus();
    cible?.click();
  };
  return (
    <div role="tablist" aria-label={label} onKeyDown={clavier} className="flex">
      {children}
    </div>
  );
}
