"use client";

import { FocusProvider } from "@/lib/focus-context";
import { ContextTagProvider } from "@/lib/context-tag-provider";
import { AuthProvider } from "@/lib/auth-context";
import { FocusModeOverlay } from "@/components/focus-mode-overlay";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { CommandPalette } from "@/components/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ContextTagProvider>
        <FocusProvider>
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          {/* Mobile navigation */}
          <MobileNav />
          <main className="flex-1 lg:ml-64 pt-16 pb-20 lg:pt-0 lg:pb-0 px-4 sm:px-6 lg:p-8 overflow-y-auto min-h-screen">
            {children}
          </main>
          <FocusModeOverlay />
          <CommandPalette />
        </FocusProvider>
      </ContextTagProvider>
    </AuthProvider>
  );
}
