// ============================================================
// UPLINK — AUTH CONTEXT
// src/contexts/AuthContext.tsx
// ============================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({ id: '1ba0dea0-5499-42af-9338-de124b2f124c' } as any);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //  // Get initial session
  //  supabase.auth.getSession().then(({ data: { session } }) => {
  //    setSession(session);
  //    setUser(session?.user ?? null);
  //    setLoading(false);
  //   });
//
    // Listen for auth changes
  //  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  //   setSession(session);
  //    setUser(session?.user ?? null);
  //    setLoading(false);
  //  });
//
  //  return () => subscription.unsubscribe();
  //}, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
