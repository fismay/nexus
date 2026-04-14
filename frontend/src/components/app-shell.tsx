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
          <main className="flex-1 w-full min-w-0 lg:ml-64 mobile-main-offset lg:pt-8 lg:pb-8 px-3 sm:px-5 md:px-6 lg:px-8 overflow-y-auto min-h-[100dvh] safe-area-x">
            {children}
          </main>
          <FocusModeOverlay />
          <CommandPalette />
        </FocusProvider>
      </ContextTagProvider>
    </AuthProvider>
  );
}
