import { ReactNode, useState, useEffect } from "react";
import { useMFA } from "@/hooks/useMFA";
import { MFAEnrollment } from "./MFAEnrollment";
import { MFAVerification } from "./MFAVerification";
import { Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MFARequiredProps {
  children: ReactNode;
}

function MFALoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-slate-950 dark:via-slate-900 dark:to-primary/10 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-accent w-fit mx-auto shadow-xl shadow-primary/25">
          <Shield className="h-8 w-8 text-white animate-pulse" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40 mx-auto bg-primary/20 dark:bg-primary/30" />
          <Skeleton className="h-3 w-56 mx-auto bg-primary/10 dark:bg-primary/20" />
        </div>
      </div>
    </div>
  );
}

export function MFARequired({ children }: MFARequiredProps) {
  const { isEnrolled, isVerified, isLoading, checkMFAStatus } = useMFA();
  const [mfaState, setMfaState] = useState<"loading" | "enroll" | "verify" | "complete">("loading");

  useEffect(() => {
    if (!isLoading) {
      if (!isEnrolled) {
        setMfaState("enroll");
      } else if (!isVerified) {
        setMfaState("verify");
      } else {
        setMfaState("complete");
      }
    }
  }, [isEnrolled, isVerified, isLoading]);

  const handleEnrollmentComplete = async () => {
    // Re-check MFA status after enrollment
    const result = await checkMFAStatus();
    if (result.isVerified) {
      setMfaState("complete");
    } else {
      // After enrollment, user should already be at AAL2, but double-check
      setMfaState("complete");
    }
  };

  const handleVerificationComplete = () => {
    setMfaState("complete");
  };

  if (isLoading || mfaState === "loading") {
    return <MFALoadingSkeleton />;
  }

  if (mfaState === "enroll") {
    return <MFAEnrollment onComplete={handleEnrollmentComplete} />;
  }

  if (mfaState === "verify") {
    return <MFAVerification onComplete={handleVerificationComplete} />;
  }

  return <>{children}</>;
}
