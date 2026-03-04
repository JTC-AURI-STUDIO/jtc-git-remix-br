import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  isTrial: boolean;
  daysLeft: number;
  planType: string | null;
}

export const useSubscription = () => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isActive: true,
    isExpired: false,
    isTrial: false,
    daysLeft: 0,
    planType: null,
  });
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao verificar assinatura:", error);
        setLoading(false);
        return;
      }

      const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
      const trialEnd = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const isExpired = now > trialEnd;
      const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      setStatus({
        isActive: !isExpired,
        isExpired,
        isTrial: !isExpired,
        daysLeft,
        planType: !isExpired ? "trial" : null,
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Erro ao verificar assinatura:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return { ...status, loading, refresh: checkSubscription };
};
