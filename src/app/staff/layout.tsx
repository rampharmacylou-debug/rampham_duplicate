"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Users, Truck, Eye } from "lucide-react";

const NAV = [
  { href: "/staff/products", label: "Products", icon: Package },
  { href: "/staff/clients", label: "Clients", icon: Users },
  //  { href: "/staff/transport", label: "Transport route", icon: Truck },
] as const;

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-hairline bg-ink text-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <div>
            <p className="font-display text-base font-bold tracking-tight">
              RAM
            </p>
            <p className="flex items-center gap-1 text-xs text-surface/50">
              <Eye size={11} /> Staff view — read only
            </p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-white/10 font-medium text-surface"
                      : "text-surface/60 hover:bg-white/5 hover:text-surface"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
            <Link
              href="/products"
              className="ml-2 flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-2 text-xs text-surface/60 hover:bg-white/5 hover:text-surface"
            >
              Admin →
            </Link>
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
