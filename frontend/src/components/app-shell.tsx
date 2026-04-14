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
          <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background lg:flex-row">
            <AmbientBackground />
            <div className="relative z-20 hidden w-0 shrink-0 lg:block lg:w-64">
              <Sidebar />
            </div>
            <MobileNav />
            <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain mobile-main-offset safe-area-x lg:py-6 lg:pb-10">
              <div className="nexus-page mx-auto w-full max-w-[90rem] px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-6 pt-3 sm:px-5 sm:pb-8 sm:pt-4 md:px-7 md:pt-5 lg:px-10 lg:pb-12 lg:pt-2 xl:px-14">
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
