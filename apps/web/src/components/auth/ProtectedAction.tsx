import { useAuth } from '@/hooks/useAuth';
import { hasPermission, UserRole } from '@/lib/rbac';
import { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface ProtectedActionProps {
  resource: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
  showAlert?: boolean;
}

export function ProtectedAction({
  resource,
  action,
  children,
  fallback,
  showAlert = false,
}: ProtectedActionProps) {
  const { user, role } = useAuth();

  if (!user || !hasPermission(role as UserRole, resource, action)) {
    if (showAlert) {
      return (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para realizar esta acción.
            {role === 'member' && ' Contacta al administrador de tu organización.'}
          </AlertDescription>
        </Alert>
      );
    }
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
