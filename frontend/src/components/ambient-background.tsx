"use client";

/**
 * Minimal Professional Background
 * Clean, flat design with subtle texture
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Solid background */}
      <div className="absolute inset-0 bg-[#0F172A]" />
      
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:64px_64px]"
        aria-hidden
      />
      
      {/* Subtle gradient overlay from top and bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-transparent to-slate-950/5" />
    </div>
  );
}
