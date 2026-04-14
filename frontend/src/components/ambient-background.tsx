"use client";

/**
 * Декоративный слой: мягкие градиенты + сетка (без влияния на клики).
 */
export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Орбы */}
      <div className="ambient-orb absolute -top-[20%] left-[10%] h-[min(90vw,720px)] w-[min(90vw,720px)] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),transparent_65%)] blur-3xl" />
      <div className="ambient-orb absolute bottom-[-15%] right-[-5%] h-[min(70vw,560px)] w-[min(70vw,560px)] rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.18),transparent_60%)] blur-3xl" />
      <div className="absolute top-1/2 left-1/2 h-[40vmin] w-[40vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.06),transparent_70%)] blur-2xl" />
      {/* Затемнение к низу */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0f1a]/40 to-[#0b0f1a]/95" />
      {/* Тонкая сетка */}
      <div
        className="ambient-grid absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.1)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_85%_55%_at_50%_-5%,black,transparent)]"
        aria-hidden
      />
      {/* Лёгкий «шум» через микропаттерн */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]"
        aria-hidden
      />
    </div>
  );
}
