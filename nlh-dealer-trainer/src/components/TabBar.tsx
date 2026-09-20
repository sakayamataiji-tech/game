"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, User, Zap } from "lucide-react";

const TABS = [
  { href: "/", label: "HOME", icon: Home },
  { href: "/train/quick/", label: "PLAY", icon: Zap },
  { href: "/stats/", label: "STATS", icon: BarChart3 },
  { href: "/profile/", label: "RATING", icon: User },
];

/** Bottom navigation for the installed app. Hidden while a training session runs. */
export function TabBar() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/train/")) return null;
  return (
    <nav className="tabbar" aria-label="メインメニュー">
      {TABS.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href} className={`tab ${active ? "tab-active" : ""}`}>
            <Icon size={22} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
