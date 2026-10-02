import { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="perforation flex flex-col items-center justify-center rounded-lg border border-dashed border-hairline bg-surface/60 px-6 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/5 text-ink">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <p className="mt-4 font-display text-base font-bold text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/15"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
