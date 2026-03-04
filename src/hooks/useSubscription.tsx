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

      // For now, treat all users as active since subscription columns
      // haven't been created yet in the profiles table
      setStatus({
        isActive: true,
        isExpired: false,
        isTrial: true,
        daysLeft: 30,
        planType: "trial",
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
