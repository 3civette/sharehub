
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Subscription {
  tier: string;
  status: string;
  event_limit: number;
  current_event_count: number;
  usage_percent: number;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  upgrade: (tier: string) => Promise<void>;
  downgrade: (tier: string) => Promise<void>;
  refresh: () => Promise<void>;
  canCreateEvent: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchSubscription() {
    try {
      setLoading(true);
      const res = await fetch('/api/subscriptions/current');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        setError(null);
      } else {
        console.error('Failed to fetch subscription:', res.status);
        setError('Failed to fetch subscription');
      }
    } catch (err) {
      console.error('Unexpected error fetching subscription:', err);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubscription();
  }, []);

  const upgrade = async (tier: string) => {
    // POST logic here
  };

  const downgrade = async (tier: string) => {
    // POST logic here
  };

  const canCreateEvent = subscription ? subscription.event_limit === -1 || subscription.current_event_count < subscription.event_limit : false;

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, error, upgrade, downgrade, refresh: fetchSubscription, canCreateEvent }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
