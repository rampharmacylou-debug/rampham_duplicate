import { CheckCircle2, CircleDashed, CircleAlert } from "lucide-react";
import { PaidStatus } from "@/lib/types";

const CONFIG: Record<
  PaidStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  paid: {
    label: "Paid",
    className: "bg-success/15 text-success",
    icon: CheckCircle2,
  },
  partial: {
    label: "Partially paid",
    className: "bg-accent/15 text-accent",
    icon: CircleDashed,
  },
  unpaid: {
    label: "Not paid",
    className: "bg-danger/15 text-danger",
    icon: CircleAlert,
  },
};

export default function PaidBadge({ status }: { status: PaidStatus }) {
  const { label, className, icon: Icon } = CONFIG[status] ?? CONFIG.unpaid;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Icon size={13} />
      {label}
    </span>
  );
}
