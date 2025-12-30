import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Json } from '@/integrations/supabase/types';

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  organization_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface UseAuditLogOptions {
  resourceType?: string;
  resourceId?: string;
  limit?: number;
}

export function useAuditLog(options: UseAuditLogOptions = {}) {
  const { organization } = useAuth();
  const { resourceType, resourceId, limit = 50 } = options;

  return useQuery({
    queryKey: ['audit-log', organization?.id, resourceType, resourceId, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }

      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!organization?.id,
  });
}

export function useLogAuditEvent() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      action: string;
      resourceType: string;
      resourceId?: string;
      resourceName?: string;
      changes?: Record<string, { old: unknown; new: unknown }>;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('log_audit_event', {
        p_action: params.action,
        p_resource_type: params.resourceType,
        p_resource_id: params.resourceId || null,
        p_resource_name: params.resourceName || null,
        p_organization_id: organization?.id || null,
        p_changes: (params.changes as Json) || null,
        p_metadata: (params.metadata as Json) || {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-log'] });
    },
  });
}

// Helper hook to automatically log changes
export function useAutoAuditLog() {
  const logEvent = useLogAuditEvent();

  const logCreate = (resourceType: string, resourceId: string, resourceName?: string) => {
    logEvent.mutate({
      action: 'create',
      resourceType,
      resourceId,
      resourceName,
    });
  };

  const logUpdate = (
    resourceType: string,
    resourceId: string,
    resourceName: string | undefined,
    changes: Record<string, { old: unknown; new: unknown }>
  ) => {
    logEvent.mutate({
      action: 'update',
      resourceType,
      resourceId,
      resourceName,
      changes,
    });
  };

  const logDelete = (resourceType: string, resourceId: string, resourceName?: string) => {
    logEvent.mutate({
      action: 'delete',
      resourceType,
      resourceId,
      resourceName,
    });
  };

  const logApprove = (resourceType: string, resourceId: string, resourceName?: string) => {
    logEvent.mutate({
      action: 'approve',
      resourceType,
      resourceId,
      resourceName,
    });
  };

  const logReject = (resourceType: string, resourceId: string, resourceName?: string) => {
    logEvent.mutate({
      action: 'reject',
      resourceType,
      resourceId,
      resourceName,
    });
  };

  return {
    logCreate,
    logUpdate,
    logDelete,
    logApprove,
    logReject,
    isLogging: logEvent.isPending,
  };
}
