"use client";

import { Plus } from "lucide-react";

type Props = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  hideAction?: boolean;
  secondaryAction?: React.ReactNode;
};

export default function PageHeader({ title, description, actionLabel, onAction, hideAction, secondaryAction }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {!hideAction && (
        <div className="flex flex-wrap items-center gap-2">
          {secondaryAction}
          <button onClick={onAction}
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface shadow-sm hover:bg-accent/90 active:translate-y-px">
            <Plus size={16} strokeWidth={2.5} />
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
