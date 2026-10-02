import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldShellProps = {
  label: string;
  children: React.ReactNode;
};

function FieldShell({ label, children }: FieldShellProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

const fieldClasses =
  "w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/40";

export function TextField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label}>
      <input className={fieldClasses} {...props} />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  ...props
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label}>
      <textarea className={`${fieldClasses} min-h-28 resize-none`} {...props} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label}>
      <select className={fieldClasses} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}
