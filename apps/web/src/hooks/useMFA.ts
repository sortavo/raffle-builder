import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MFAFactor {
  id: string;
  type: string;
  status: string;
  friendly_name?: string;
}

interface MFAState {
  isEnrolled: boolean;
  isVerified: boolean;
  currentLevel: "aal1" | "aal2" | null;
  isLoading: boolean;
  factors: MFAFactor[];
  error: string | null;
}

interface EnrollmentResult {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function useMFA() {
  const [state, setState] = useState<MFAState>({
    isEnrolled: false,
    isVerified: false,
    currentLevel: null,
    isLoading: true,
    factors: [],
    error: null,
  });

  const checkMFAStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Get current AAL level
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aalError) {
        throw aalError;
      }

      // List enrolled factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        throw factorsError;
      }

      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
      const isEnrolled = verifiedFactors.length > 0;
      const isVerified = aalData?.currentLevel === 'aal2';

      setState({
        isEnrolled,
        isVerified,
        currentLevel: aalData?.currentLevel || null,
        isLoading: false,
        factors: verifiedFactors.map(f => ({
          id: f.id,
          type: f.factor_type,
          status: f.status,
          friendly_name: f.friendly_name,
        })),
        error: null,
      });

      return { isEnrolled, isVerified };
    } catch (error) {
      console.error("[useMFA] Error checking MFA status:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error checking MFA status",
      }));
      return { isEnrolled: false, isVerified: false };
    }
  }, []);

  const enroll = useCallback(async (friendlyName?: string): Promise<EnrollmentResult | null> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName || 'Sortavo Admin MFA',
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("No enrollment data returned");
      }

      return {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      };
    } catch (error) {
      console.error("[useMFA] Error enrolling MFA:", error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Error enrolling MFA",
      }));
      return null;
    }
  }, []);

  const verifyEnrollment = useCallback(async (factorId: string, code: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        throw challengeError;
      }

      // Verify with the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        throw verifyError;
      }

      // Refresh status
      await checkMFAStatus();
      return true;
    } catch (error) {
      console.error("[useMFA] Error verifying MFA:", error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Código inválido",
      }));
      return false;
    }
  }, [checkMFAStatus]);

  const verify = useCallback(async (code: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Get the first verified factor
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factorsData?.totp?.find(f => f.status === 'verified');

      if (!verifiedFactor) {
        throw new Error("No MFA factor found");
      }

      // Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (challengeError) {
        throw challengeError;
      }

      // Verify with the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        throw verifyError;
      }

      // Refresh status
      await checkMFAStatus();
      return true;
    } catch (error) {
      console.error("[useMFA] Error verifying MFA:", error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Código inválido",
      }));
      return false;
    }
  }, [checkMFAStatus]);

  const unenroll = useCallback(async (factorId: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        throw error;
      }

      // Refresh status
      await checkMFAStatus();
      return true;
    } catch (error) {
      console.error("[useMFA] Error unenrolling MFA:", error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Error removing MFA",
      }));
      return false;
    }
  }, [checkMFAStatus]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    checkMFAStatus();
  }, [checkMFAStatus]);

  return {
    ...state,
    enroll,
    verifyEnrollment,
    verify,
    unenroll,
    checkMFAStatus,
    clearError,
  };
}
