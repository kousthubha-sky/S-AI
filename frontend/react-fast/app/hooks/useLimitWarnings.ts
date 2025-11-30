import { useEffect, useRef } from 'react';
import { useToast } from '~/components/ui/toast';
import { useAuthApi } from './useAuthApi';

interface UsageData {
  daily_message_count?: number;
  monthly_message_count?: number;
  prompt_count?: number;
  tier?: string;
  limits?: {
    requests_per_day?: number;
    requests_per_month?: number;
  };
  usage_percentage?: {
    daily?: number;
    monthly?: number;
  };
  warnings?: {
    approaching_limit?: boolean;
    limit_reached?: boolean;
    subscription_expiring_soon?: boolean;
  };
  subscription?: {
    days_remaining?: number;
    is_active?: boolean;
  };
}

/**
 * Hook to handle limit warnings and display appropriate toast messages
 * Fetches usage data periodically and shows warnings when thresholds are reached
 */
export const useLimitWarnings = (enabled: boolean = true, interval: number = 60000) => {
  const { showToast } = useToast();
  const { fetchWithAuth } = useAuthApi();
  const shownWarningsRef = useRef<Set<string>>(new Set());
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const checkLimits = async () => {
      const now = Date.now();
      // Avoid fetching more than every 30 seconds
      if (now - lastFetchRef.current < 30000) return;

      try {
        const usage = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/usage`) as UsageData;
        lastFetchRef.current = now;

        const tier = usage.tier || 'free';

        // Helper to show warning only once per session
        const showOnce = (key: string, message: string, type: 'warning' | 'error' | 'info' = 'warning', duration = 5000) => {
          if (!shownWarningsRef.current.has(key)) {
            showToast(message, type, duration);
            shownWarningsRef.current.add(key);
          }
        };

        // Handle limit reached
        if (usage.warnings?.limit_reached) {
          if (tier === 'free') {
            showOnce('limit_reached_free', 'Daily limit reached (50/day). Upgrade to continue!', 'error', 6000);
          } else if (tier === 'starter') {
            showOnce('limit_reached_starter', ' Monthly limit reached (500/month). Upgrade to Pro!', 'error', 6000);
          } else if (tier === 'pro') {
            showOnce('limit_reached_pro', ' Monthly limit reached (2000/month). Upgrade to Pro Plus!', 'error', 6000);
          }
          return;
        }

        // Handle approaching limit
        if (usage.warnings?.approaching_limit) {
          if (tier === 'free') {
            const remaining = (usage.limits?.requests_per_day || 50) - (usage.daily_message_count || 0);
            showOnce('approaching_limit_free', ` Only ${remaining} messages left today!`, 'warning', 5000);
          } else if (tier === 'starter') {
            const remaining = (usage.limits?.requests_per_month || 500) - (usage.prompt_count || 0);
            showOnce('approaching_limit_starter', ` Only ${remaining} monthly requests left!`, 'warning', 5000);
          } else if (tier === 'pro') {
            const remaining = (usage.limits?.requests_per_month || 2000) - (usage.prompt_count || 0);
            showOnce('approaching_limit_pro', ` Only ${remaining} monthly requests left!`, 'warning', 5000);
          }
        }

        // Handle subscription expiring soon
        if (usage.warnings?.subscription_expiring_soon && usage.subscription?.days_remaining) {
          const days = usage.subscription.days_remaining;
          if (days <= 0) {
            showOnce('subscription_expired', ' Your subscription has expired. Renew to continue!', 'error', 6000);
          } else {
            showOnce('subscription_expiring', ` Your subscription expires in ${days} day(s)!`, 'warning', 5000);
          }
        }

        // Reset warnings on new day (for free tier)
        if (tier === 'free' && usage.daily_message_count === 0) {
          shownWarningsRef.current.delete('approaching_limit_free');
          shownWarningsRef.current.delete('limit_reached_free');
        }

      } catch (error) {
        console.error('Failed to check limits:', error);
      }
    };

    checkLimits();
    const timer = setInterval(checkLimits, interval);

    return () => clearInterval(timer);
  }, [enabled, interval, showToast, fetchWithAuth]);

  return {
    clearWarnings: () => shownWarningsRef.current.clear(),
  };
};
