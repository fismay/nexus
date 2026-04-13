"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ContextTagState {
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
  toggleTag: (tag: string) => void;
}

const ContextTagContext = createContext<ContextTagState>({
  activeTag: null,
  setActiveTag: () => {},
  toggleTag: () => {},
});

export function ContextTagProvider({ children }: { children: React.ReactNode }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const toggleTag = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
  }, []);

  return (
    <ContextTagContext.Provider value={{ activeTag, setActiveTag, toggleTag }}>
      {children}
    </ContextTagContext.Provider>
  );
}

export function useContextTag() {
  return useContext(ContextTagContext);
}
