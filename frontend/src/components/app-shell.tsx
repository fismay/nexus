"use client";

import { FocusProvider } from "@/lib/focus-context";
import { ContextTagProvider } from "@/lib/context-tag-provider";
import { AuthProvider } from "@/lib/auth-context";
import { FocusModeOverlay } from "@/components/focus-mode-overlay";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { CommandPalette } from "@/components/command-palette";
import { AmbientBackground } from "@/components/ambient-background";
import { PageTransition } from "@/components/page-transition";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ContextTagProvider>
        <FocusProvider>
          <div className="relative flex min-h-0 w-full flex-1 flex-col bg-background lg:flex-row">
            <AmbientBackground />
            <div className="relative z-20 hidden w-0 shrink-0 lg:block lg:w-64">
              <Sidebar />
            </div>
            <MobileNav />
            <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain mobile-main-offset lg:py-8 lg:pb-8 safe-area-x">
              <div className="nexus-page mx-auto w-full max-w-[90rem] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 pb-1 sm:pb-2">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
            <FocusModeOverlay />
            <CommandPalette />
          </div>
        </FocusProvider>
      </ContextTagProvider>
    </AuthProvider>
  );
}
