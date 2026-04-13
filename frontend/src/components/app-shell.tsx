"use client";

import { FocusProvider } from "@/lib/focus-context";
import { ContextTagProvider } from "@/lib/context-tag-provider";
import { AuthProvider } from "@/lib/auth-context";
import { FocusModeOverlay } from "@/components/focus-mode-overlay";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ContextTagProvider>
        <FocusProvider>
          <Sidebar />
          <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
            {children}
          </main>
          <FocusModeOverlay />
          <CommandPalette />
        </FocusProvider>
      </ContextTagProvider>
    </AuthProvider>
  );
}
