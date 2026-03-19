// ============================================================
// src/contexts/AppContext.tsx
// ============================================================
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { getDB } from '@/lib/db';

interface Profile {
  callsign: string;
  display_name: string | null;
  theme: string;
  custom_class: string | null;
  widget_layout: string | null;
  active_widgets: string | null;
  wizard_complete: boolean;
}

interface AppContextValue {
  ready: boolean;
  profile: Profile | null;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  ready: false,
  profile: null,
  updateProfile: async () => {},
  refreshProfile: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady]     = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const initRef = useRef(false); // prevent double-init in strict mode

  const loadProfile = async () => {
    try {
      const db = await getDB();
      const result = await db.query<Profile>(
        `SELECT callsign, display_name, theme, custom_class,
                widget_layout, active_widgets, wizard_complete
         FROM profile WHERE id = 1 LIMIT 1;`
      );
      setProfile(result.rows[0] ?? null);
    } catch (err) {
      console.error('loadProfile failed:', err);
    }
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        await getDB();
        await loadProfile();
        setReady(true);
      } catch (err) {
        console.error('DB init failed:', err);
        // Still set ready so the app doesn't hang on black screen
        setReady(true);
      }
    })();
  }, []); // empty deps — run once only

  const updateProfile = async (patch: Partial<Profile>) => {
    try {
      const db   = await getDB();
      const sets = Object.entries(patch)
        .map(([k, v]) => {
          if (v === null || v === undefined) return `${k} = NULL`;
          if (typeof v === 'boolean') return `${k} = ${v}`;
          return `${k} = '${String(v).replace(/'/g, "''")}'`;
        })
        .join(', ');
      if (sets) await db.exec(`UPDATE profile SET ${sets} WHERE id = 1;`);
      await loadProfile();
    } catch (err) {
      console.error('updateProfile failed:', err);
    }
  };

  return (
    <AppContext.Provider value={{ ready, profile, updateProfile, refreshProfile: loadProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

// Backwards-compat shim — components using useAuth() keep working
export function useAuth() {
  const { ready, profile } = useContext(AppContext);
  return {
    user: ready ? { id: 'local', email: 'local@uplink' } : null,
    profile,
    loading: !ready,
  };
}