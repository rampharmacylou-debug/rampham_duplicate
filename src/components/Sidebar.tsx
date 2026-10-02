"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, NotebookPen, Truck, Users, Eye, Settings } from "lucide-react";

const NAV = [
  { href: "/products",  label: "Products",  icon: Package },
  { href: "/diary",     label: "Diary",     icon: NotebookPen },
  { href: "/clients",   label: "Clients",   icon: Users },
  { href: "/transport", label: "Transport", icon: Truck },
  { href: "/settings",  label: "Settings",  icon: Settings },
] as const;

type Props = { onNavigate?: () => void };

export default function Sidebar({ onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-ink text-surface">
      <div className="px-6 py-7">
        <p className="font-display text-[1.05rem] font-bold tracking-tight text-surface">
          Manifest
        </p>
        <p className="mt-1 text-xs text-surface/55">Admin dashboard</p>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "pennant bg-white/10 font-medium text-surface"
                      : "text-surface/65 hover:bg-white/5 hover:text-surface"
                  }`}
                >
                  <Icon size={17} strokeWidth={2} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Staff view link */}
      <div className="px-3 pb-3">
        <Link
          href="/staff/products"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md border border-white/15 px-3 py-2.5 text-sm text-surface/60 transition-colors hover:bg-white/5 hover:text-surface"
        >
          <Eye size={15} />
          Open staff view
        </Link>
      </div>

      <div className="px-6 py-4 text-xs text-surface/35">
        Stored in local database.
      </div>
    </aside>
  );
}
