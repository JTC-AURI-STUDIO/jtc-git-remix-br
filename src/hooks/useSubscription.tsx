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
        .select("trial_ends_at, subscription_ends_at, subscription_plan")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Erro ao verificar assinatura:", error);
        setLoading(false);
        return;
      }

      const now = new Date();
      const isTrial = profile.subscription_plan === "trial";
      
      let expirationDate: Date | null = null;
      
      if (isTrial && profile.trial_ends_at) {
        expirationDate = new Date(profile.trial_ends_at);
      } else if (profile.subscription_ends_at) {
        expirationDate = new Date(profile.subscription_ends_at);
      }

      const isExpired = expirationDate ? now > expirationDate : false;
      const daysLeft = expirationDate 
        ? Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      setStatus({
        isActive: !isExpired,
        isExpired,
        isTrial,
        daysLeft,
        planType: profile.subscription_plan,
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
