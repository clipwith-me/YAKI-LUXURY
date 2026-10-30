import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { Icon } from "@/components/ui/icons";
import { NavLink } from "./nav-link";
import { logoutAction } from "@/app/actions/public";

export type NavItem = { href: string; label: string; icon: keyof typeof Icon; badge?: number };

/** Shared app shell for customer, partner and admin areas: sidebar on desktop, scrollable tabs on mobile. */
export function DashboardShell({ title, nav, user, unread, children }: { title: string; nav: NavItem[]; user: { name: string; subtitle: string }; unread: number; children: ReactNode }) {
  const notificationsHref = `${nav[0]?.href ?? ""}/notifications`;
  return (
    <div className="min-h-screen bg-stone-50 lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-stone-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-[72px] items-center px-6"><Logo /></div>
        <p className="px-6 pt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-stone-400">{title}</p>
        <nav aria-label={title} className="mt-3 flex-1 space-y-0.5 px-3">
          {nav.map((n) => {
            const I = Icon[n.icon];
            return (
              <NavLink key={n.href} href={n.href} exact={n.href === nav[0]?.href} className="flex items-center gap-3 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-ink" activeClassName="bg-stone-100 text-ink font-medium">
                <I size={17} /> <span className="flex-1">{n.label}</span>
                {n.badge ? <span className="min-w-5 rounded-full bg-brass-500 px-1.5 text-center text-[10px] text-white">{n.badge}</span> : null}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-stone-200 p-4 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-stone-500">{user.subtitle}</p>
          <div className="mt-3 flex gap-3 text-xs">
            <Link href="/" className="text-stone-600 hover:text-ink">View site</Link>
            <form action={logoutAction}><button className="flex items-center gap-1 text-stone-600 hover:text-ink"><Icon.Logout size={14} /> Sign out</button></form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-8 lg:h-[72px]">
            <div className="lg:hidden"><Logo /></div>
            <p className="hidden text-sm text-stone-500 lg:block">{title}</p>
            <div className="flex items-center gap-2">
              <Link href={notificationsHref} aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`} className="relative flex h-10 w-10 items-center justify-center text-stone-600 hover:text-ink">
                <Icon.Bell />
                {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brass-500" />}
              </Link>
              <form action={logoutAction} className="lg:hidden"><button aria-label="Sign out" className="flex h-10 w-10 items-center justify-center text-stone-600"><Icon.Logout /></button></form>
            </div>
          </div>
          <nav aria-label={`${title} mobile`} className="scrollbar-none flex gap-1 overflow-x-auto border-t border-stone-100 px-3 py-2 lg:hidden">
            {nav.map((n) => (
              <NavLink key={n.href} href={n.href} exact={n.href === nav[0]?.href} className="shrink-0 px-3 py-1.5 text-xs text-stone-600" activeClassName="bg-ink text-ivory">{n.label}{n.badge ? ` (${n.badge})` : ""}</NavLink>
            ))}
          </nav>
        </header>
        <main id="main" className="px-4 py-8 sm:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h1 className="text-3xl sm:text-4xl">{title}</h1>{description && <p className="mt-1 text-sm text-stone-600">{description}</p>}</div>
      {action}
    </div>
  );
}
