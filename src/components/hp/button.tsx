import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Charte V2 : quatre styles seulement.
// primaire (anthracite) = principal, publie ; secondaire (blanc, bordure grise) = consulte, modifie ;
// valide (vert) et refuse (bordure et texte rouges) pour les seules décisions.
export const hpButtonVariants = cva(
  "label-13 inline-flex h-11 min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-4 border-[1.5px] cursor-pointer disabled:cursor-not-allowed disabled:bg-neutral-1 disabled:border-line disabled:text-ink-2",
  {
    variants: {
      role: {
        valide: "bg-[#298646] border-[#298646] text-white hover:bg-[#14522A] hover:border-[#14522A]",
        refuse: "bg-white border-[#C2272D] text-[#C2272D] hover:bg-neutral-1",
        modifie: "bg-white border-field text-anthracite hover:bg-neutral-1",
        publie: "bg-anthracite border-anthracite text-on-anthracite hover:bg-ink",
        consulte: "bg-white border-field text-anthracite hover:bg-neutral-1",
        principal: "bg-anthracite border-anthracite text-on-anthracite hover:bg-ink",
      },
    },
    defaultVariants: { role: "consulte" },
  },
);

type HpButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role"> &
  VariantProps<typeof hpButtonVariants> & { icon?: LucideIcon };

export function HpButton({ role, icon: Icon, className, children, ...props }: HpButtonProps) {
  return (
    <button type="button" className={cn(hpButtonVariants({ role }), className)} {...props}>
      {Icon && <Icon size={16} aria-hidden strokeWidth={2} />}
      <span>{children}</span>
    </button>
  );
}

export function HpIconButton({
  icon: Icon,
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex size-11 items-center justify-center border-[1.5px] border-field bg-white text-anthracite hover:bg-neutral-1 cursor-pointer",
        className,
      )}
      {...props}
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}
