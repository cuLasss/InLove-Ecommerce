import './disable-logs';

import { createRoot } from 'react-dom/client';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { MockDataProvider } from '@/contexts/MockDataContext';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      gcTime: 30 * 60 * 1000,
    },
  },
  queryCache: new QueryCache({
    onError: (_error, query) => {
      removeStaleSiblingQueries(query.queryKey);
    },
    onSuccess: (_data, query) => {
      removeStaleSiblingQueries(query.queryKey);
    },
  }),
});

function removeStaleSiblingQueries(queryKey: readonly unknown[]) {
  try {
    const rootKey = queryKey[0];

    if (typeof rootKey !== 'string' || rootKey.length === 0) {
      return;
    }

    queryClient
      .getQueryCache()
      .findAll({
        predicate: (query) =>
          query.queryKey[0] === rootKey &&
          query.queryKey !== queryKey &&
          Date.now() - query.state.dataUpdatedAt > 60000,
      })
      .forEach((query) => queryClient.removeQueries({ queryKey: query.queryKey }));
  } catch {
    // Cache cleanup should never block app bootstrap.
  }
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MockDataProvider>
        <App />
      </MockDataProvider>
    </AuthProvider>
  </QueryClientProvider>
);
