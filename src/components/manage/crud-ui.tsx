import { X } from "lucide-react";
import type { ReactNode } from "react";
import { HpButton, HpIconButton } from "@/components/hp/button";
import type { FieldErrors } from "@/lib/manage-schemas";

const inputBase = "min-h-11 w-full border border-field bg-white px-3 text-[14px] leading-5 text-ink";

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="label block text-ink">{label}</label>
      {children}
      {error ? <p role="alert" className="text-[12px] leading-4 font-semibold text-[#8E1A1F]">{error}</p> : null}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} py-2 ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-anthracite/50 p-4 md:p-8">
      <div role="dialog" aria-modal="true" aria-label={title} className="hp-shell flex w-full max-w-2xl flex-col gap-5 border border-anthracite bg-white p-6">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-[24px] leading-8">{title}</h2>
          <HpIconButton icon={X} label="Fermer" className="border-0" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormActions({ pending, onCancel, submitLabel = "ENREGISTRER" }: { pending?: boolean; onCancel: () => void; submitLabel?: string }) {
  return (
    <div className="flex justify-end gap-3 pt-3">
      <HpButton role="consulte" onClick={onCancel}>ANNULER</HpButton>
      <button
        type="submit"
        disabled={pending}
        className="label-13 inline-flex h-11 items-center justify-center border-[1.5px] border-anthracite bg-anthracite px-4 text-on-anthracite hover:bg-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-neutral-1 disabled:text-ink-2"
      >
        {pending ? "…" : submitLabel}
      </button>
    </div>
  );
}

export function ErrorSummary({ errors }: { errors: FieldErrors }) {
  const count = Object.keys(errors).length;
  if (!count) return null;
  return (
    <div role="alert" className="border border-line border-l-4 border-l-anthracite bg-neutral-1 p-3 text-[14px] leading-5 wrap-anywhere">
      <p className="font-semibold">{count} champ{count > 1 ? "s" : ""} à corriger avant l'enregistrement.</p>
      <ul className="mt-1 list-disc pl-5">
        {Object.entries(errors).map(([k, m]) => (
          <li key={k}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

export function RowActions({ onEdit, onDelete, deleting }: { onEdit: () => void; onDelete: () => void; deleting?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <button type="button" onClick={onEdit} className="inline-flex h-11 cursor-pointer items-center px-1 text-[14px] leading-5 font-semibold text-anthracite underline underline-offset-4 hover:text-ink">
        Modifier
      </button>
      <button type="button" onClick={onDelete} disabled={deleting} className="inline-flex h-11 cursor-pointer items-center px-1 text-[14px] leading-5 font-semibold text-[#8E1A1F] underline underline-offset-4 hover:text-ink disabled:opacity-50">
        Supprimer
      </button>
    </div>
  );
}

export function ConfirmDelete({ label, onCancel, onConfirm, pending }: { label: string; onCancel: () => void; onConfirm: () => void; pending?: boolean }) {
  return (
    <Modal title="Confirmer la suppression" onClose={onCancel}>
      <p className="text-[14px] leading-6">
        Supprimer définitivement <strong>{label}</strong> ? Cette action est irréversible.
      </p>
      <div className="flex justify-end gap-3 pt-3">
        <HpButton role="consulte" onClick={onCancel}>ANNULER</HpButton>
        <HpButton role="refuse" disabled={pending} onClick={onConfirm}>{pending ? "SUPPRESSION…" : "SUPPRIMER"}</HpButton>
      </div>
    </Modal>
  );
}
