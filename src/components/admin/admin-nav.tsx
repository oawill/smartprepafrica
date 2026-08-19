"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavGroup } from "@/lib/admin/nav";

export function AdminNav({ groups }: { groups: AdminNavGroup[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <nav className="flex flex-col gap-1 text-sm">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.label] ?? false;
        return (
          <div key={group.label} className="mb-1">
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [group.label]: !isCollapsed }))}
              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-300"
            >
              {group.label}
              <span className="text-slate-600">{isCollapsed ? "+" : "–"}</span>
            </button>
            {!isCollapsed && (
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-lg px-3 py-1.5 ${
                        active
                          ? "bg-orange-500/10 text-orange-400"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
