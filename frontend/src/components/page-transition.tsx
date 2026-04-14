"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Лёгкий fade/slide при смене маршрута (уважает prefers-reduced-motion).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      className="min-h-0 w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
