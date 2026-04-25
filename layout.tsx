import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CheckSquare, ClipboardList, Command, Users } from "lucide-react";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "SlimThicc Command Center",
  description: "Internal CRM, objectives, notes, and operations dashboard for SlimThicc."
};

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/objectives", label: "Daily Objectives", icon: CheckSquare },
  { href: "/notes", label: "Notes Board", icon: ClipboardList }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="command-grid min-h-screen">
          <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
            <aside className="border-b border-border bg-background/80 p-5 backdrop-blur lg:border-b-0 lg:border-r">
              <Link href="/" className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Command className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-lg font-black tracking-normal">SlimThicc</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Command Center
                  </span>
                </span>
              </Link>

              <nav className="mt-8 grid gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-8 rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Operating Rule
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Every lead, supplier, creator, and task gets an owner, a next step, and a place to live.
                </p>
              </div>
            </aside>

            <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
