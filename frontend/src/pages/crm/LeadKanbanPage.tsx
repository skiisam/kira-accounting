import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put } from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircleIcon, XMarkIcon, ArrowRightCircleIcon } from '@heroicons/react/24/outline';

type Lead = {
  id: number;
  code: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  source?: string;
  status: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

const PIPELINE = ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

export default function LeadKanbanPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: () => get('/messaging/leads').then((res) => (res as any).data || res),
  });
  const leads: Lead[] = (data as any)?.data || data || [];

  const grouped = useMemo(() => {
    const g: Record<string, Lead[]> = {};
    PIPELINE.forEach((s) => (g[s] = []));
    leads.forEach((l) => {
      if (!g[l.status]) g[l.status] = [];
      g[l.status].push(l);
    });
    return g;
  }, [leads]);

  const updateStatus = useMutation({
    mutationFn: (payload: { id: number; status: string }) =>
      put(`/messaging/leads/${payload.id}/status`, { status: payload.status }),
    onSuccess: () => {
      toast.success('Lead updated');
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || 'Failed to update lead'),
  });

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {PIPELINE.map((status) => (
          <div key={status} className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{status}</h3>
                <span className="badge">{grouped[status]?.length || 0}</span>
              </div>
            </div>
            <div className="card-body space-y-3">
              {isLoading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : (grouped[status] || []).length === 0 ? (
                <div className="text-sm text-gray-500">No leads</div>
              ) : (
                (grouped[status] || []).map((lead) => (
                  <div key={lead.id} className="border rounded-lg p-3 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{lead.companyName || lead.contactName || lead.code}</div>
                        <div className="text-xs text-gray-500">
                          {lead.phone || '-'} • {lead.source || 'Unknown'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {status !== 'WON' && status !== 'LOST' && (
                          <>
                            <button
                              className="btn btn-xs"
                              onClick={() => {
                                const idx = PIPELINE.indexOf(status);
                                const next = PIPELINE[Math.min(idx + 1, PIPELINE.length - 1)];
                                if (next === status) return;
                                updateStatus.mutate({ id: lead.id, status: next });
                              }}
                              title="Move to next stage"
                            >
                              <ArrowRightCircleIcon className="w-4 h-4" />
                            </button>
                            <button
                              className="btn btn-xs"
                              onClick={() => updateStatus.mutate({ id: lead.id, status: 'WON' })}
                              title="Mark as won"
                            >
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              className="btn btn-xs"
                              onClick={() => updateStatus.mutate({ id: lead.id, status: 'LOST' })}
                              title="Mark as lost"
                            >
                              <XMarkIcon className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {lead.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-3">{lead.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
