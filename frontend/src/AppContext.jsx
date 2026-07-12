/**
 * AppContext.jsx
 * Estat global lleuger: preferències d'usuari i continguts completats.
 * Tot persistit a localStorage.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [furiganaEnabled, setFuriganaEnabled] = useState(() => {
    const stored = localStorage.getItem('rn_furigana');
    return stored === null ? true : stored === 'true';
  });

  // Set de IDs completats: { contentId: true }
  const [completed, setCompleted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rn_completed') || '{}');
    } catch {
      return {};
    }
  });

  const toggleFurigana = () => {
    setFuriganaEnabled(v => {
      localStorage.setItem('rn_furigana', String(!v));
      return !v;
    });
  };

  const markCompleted = (contentId) => {
    setCompleted(prev => {
      const next = { ...prev, [contentId]: true };
      localStorage.setItem('rn_completed', JSON.stringify(next));
      return next;
    });
  };

  const resetCompleted = () => {
    setCompleted({});
    localStorage.removeItem('rn_completed');
  };

  return (
    <AppContext.Provider value={{
      furiganaEnabled,
      toggleFurigana,
      completed,
      markCompleted,
      resetCompleted,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
