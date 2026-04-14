// ============================================================
// UPLINK — MAIN ENTRY POINT
// src/main.tsx
// ============================================================

import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from '@/contexts/AppContext';
import App from './App.tsx';
import './index.css';
import './styles/themes.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // 30s window: shared query keys (habits, operator, stats, etc.) are
      // fetched once and reused across all widgets instead of refetching
      // on every component mount. Mutations still invalidate immediately.
      staleTime: 30_000,
      refetchOnMount: true,       // only refetch if data is actually stale
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  },
});

export { queryClient };

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <App />
    </AppProvider>
  </QueryClientProvider>
);
