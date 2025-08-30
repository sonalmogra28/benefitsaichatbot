// hooks/use-session.ts
import useSWR from 'swr';

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const error: any = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export function useSession() {
  const { data, error, isLoading } = useSWR('/api/auth/session', fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });

  return {
    session: data,
    isLoading,
    error,
    isAuthenticated: !error && data,
  };
}
