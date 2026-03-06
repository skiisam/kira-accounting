import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';
import { 
  InboxIcon, 
  UserPlusIcon, 
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Inquiry {
  id: number;
  platform: string;
  senderPhone?: string;
  senderName?: string;
  senderUsername?: string;
  message: string;
  status: string;
  customerId?: number;
  crmLeadId?: number;
  createdAt: string;
  processedAt?: string;
}

interface MessageTemplate {
  id?: number;
  code: string;
  name: string;
  category: string;
  platform?: string;
  subject?: string;
  body: string;
  isDefault: boolean;
  isActive: boolean;
}

const platformIcons: Record<string, string> = {
  WHATSAPP: '💬',
  TELEGRAM: '✈️',
  WECHAT: '💚',
};

const statusBadges: Record<string, string> = {
  NEW: 'badge-warning',
  IN_PROGRESS: 'badge-info',
  CONVERTED: 'badge-success',
  CLOSED: 'badge-gray',
};

export default function MessagingInboxPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('NEW');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyPlatform, setReplyPlatform] = useState<string>('WHATSAPP');
  const [replyBody, setReplyBody] = useState<string>('');
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('');
  const [logsPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['messaging-inquiries', statusFilter, page],
    queryFn: () => get<any>(`/messaging/inquiries?status=${statusFilter}&page=${page}&pageSize=20`),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['messaging-templates'],
    queryFn: () => get<MessageTemplate[]>(`/messaging/templates`),
  });

  const convertToLeadMutation = useMutation({
    mutationFn: (inquiryId: number) => post(`/messaging/inquiries/${inquiryId}/convert-to-lead`),
    onSuccess: () => {
      toast.success('Inquiry converted to CRM lead');
      queryClient.invalidateQueries({ queryKey: ['messaging-inquiries'] });
      setSelectedInquiry(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Conversion failed'),
  });

  const sendReplyMutation = useMutation({
    mutationFn: (payload: {
      platform: string;
      recipientPhone?: string;
      recipientChatId?: string;
      message: string;
      customerId?: number;
    }) => post(`/messaging/send`, payload),
    onSuccess: () => {
      toast.success('Reply sent');
      queryClient.invalidateQueries({ queryKey: ['messaging-inquiries'] });
      setReplyBody('');
      setSelectedTemplateCode('');
      // keep modal open for further actions
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to send'),
  });

  const inquiries: Inquiry[] = data?.data || [];
  const pagination = data?.pagination;

  const filteredInquiries = useMemo(() => {
    if (platformFilter === 'ALL') return inquiries;
    return inquiries.filter(i => i.platform === platformFilter);
  }, [inquiries, platformFilter]);

  const knownPlaceholders = useMemo(
    () => [
      'customerName',
      'documentNo',
      'amount',
      'dueDate',
      'companyName',
      'invoiceDate',
      'paymentDate',
      'outstandingAmount',
      'daysOverdue',
    ],
    []
  );

  const detectedVariables = useMemo(() => {
    const vars = new Set<string>();
    const re = /\{\{\s*(\w+)\s*\}\}/g;
    let m: RegExpExecArray | null;
    const source = replyBody || '';
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(source)) !== null) {
      vars.add(m[1]);
    }
    return Array.from(vars);
  }, [replyBody]);

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: [
      'messaging-logs',
      selectedInquiry?.customerId || 'none',
      selectedInquiry?.platform || 'none',
      logsPage,
    ],
    queryFn: () => {
      if (!selectedInquiry) return Promise.resolve(null as any);
      const params = new URLSearchParams();
      if (selectedInquiry.customerId) params.set('customerId', String(selectedInquiry.customerId));
      if (selectedInquiry.platform) params.set('platform', selectedInquiry.platform);
      params.set('page', String(logsPage));
      params.set('pageSize', '10');
      return get<any>(`/messaging/logs?${params.toString()}`);
    },
    enabled: !!selectedInquiry,
  });

  const recentLogs = useMemo(() => {
    const all = logsData?.data || [];
    if (selectedInquiry?.senderPhone) {
      return all.filter((l: any) => l.recipientPhone === selectedInquiry.senderPhone).slice(0, 10);
    }
    return all.slice(0, 10);
  }, [logsData, selectedInquiry]);

  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpNote, setFollowUpNote] = useState<string>('');
  const followUpMutation = useMutation({
    mutationFn: (data: { id: number; activityDate: string; note: string }) =>
      post(`/messaging/inquiries/${data.id}/follow-up`, {
        activityDate: data.activityDate,
        note: data.note,
      }),
    onSuccess: () => {
      toast.success('Follow-up scheduled');
      setFollowUpDate('');
      setFollowUpNote('');
      queryClient.invalidateQueries({ queryKey: ['messaging-inquiries'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to schedule follow-up'),
  });

  const columns = [
    {
      key: 'platform',
      header: 'Platform',
      render: (row: Inquiry) => (
        <span className="flex items-center gap-1">
          {platformIcons[row.platform]} {row.platform}
        </span>
      ),
    },
    {
      key: 'sender',
      header: 'Sender',
      render: (row: Inquiry) => (
        <div>
          <div className="font-medium">{row.senderName || 'Unknown'}</div>
          <div className="text-xs text-gray-500">
            {row.senderUsername && `@${row.senderUsername}`}
            {row.senderPhone && ` • ${row.senderPhone}`}
          </div>
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (row: Inquiry) => (
        <div className="max-w-md truncate" title={row.message}>
          {row.message?.substring(0, 100)}
          {row.message?.length > 100 ? '...' : ''}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Inquiry) => (
        <span className={`badge ${statusBadges[row.status] || 'badge-gray'}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Received',
      render: (row: Inquiry) => (
        <div className="text-sm">
          {new Date(row.createdAt).toLocaleString()}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: Inquiry) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInquiry(row);
            setReplyPlatform(row.platform || 'WHATSAPP');
            setReplyBody('');
            setSelectedTemplateCode('');
          }}
          className="btn btn-secondary btn-sm"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <InboxIcon className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Messaging Inbox</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Platform</label>
          <select
            value={platformFilter}
            onChange={(e) => {
              setPlatformFilter(e.target.value);
              setPage(1);
            }}
            className="input"
          >
            <option value="ALL">All</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="TELEGRAM">Telegram</option>
            <option value="WECHAT">WeChat</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { status: 'NEW', label: 'New', icon: <InboxIcon className="w-5 h-5" />, color: 'text-yellow-600' },
          { status: 'IN_PROGRESS', label: 'In Progress', icon: <ClockIcon className="w-5 h-5" />, color: 'text-blue-600' },
          { status: 'CONVERTED', label: 'Converted', icon: <UserPlusIcon className="w-5 h-5" />, color: 'text-green-600' },
          { status: 'CLOSED', label: 'Closed', icon: <CheckCircleIcon className="w-5 h-5" />, color: 'text-gray-600' },
        ].map((stat) => (
          <button
            key={stat.status}
            onClick={() => {
              setStatusFilter(stat.status);
              setPage(1);
            }}
            className={`card hover:shadow-md transition-shadow ${statusFilter === stat.status ? 'ring-2 ring-primary-500' : ''}`}
          >
            <div className="card-body flex items-center gap-3">
              <div className={stat.color}>{stat.icon}</div>
              <div className="text-left">
                <div className="text-sm text-gray-500">{stat.label}</div>
                <div className="text-xl font-bold">{stat.status === statusFilter ? pagination?.total || 0 : '-'}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Inquiries List */}
      <div className="card">
        <DataTable
          columns={columns}
          data={filteredInquiries}
          loading={isLoading}
          onRowClick={(row) => setSelectedInquiry(row)}
          pagination={pagination ? { ...pagination, onPageChange: setPage } : undefined}
        />
        {filteredInquiries.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No {statusFilter.toLowerCase()} inquiries</p>
          </div>
        )}
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {platformIcons[selectedInquiry.platform]} Inquiry Details
              </h3>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="card-body space-y-4">
              {/* Sender Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Sender Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500">Name:</span>
                    <p className="font-medium">{selectedInquiry.senderName || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Platform:</span>
                    <p className="font-medium flex items-center gap-1">
                      {platformIcons[selectedInquiry.platform]} {selectedInquiry.platform}
                    </p>
                  </div>
                  {selectedInquiry.senderPhone && (
                    <div>
                      <span className="text-xs text-gray-500">Phone:</span>
                      <p className="font-medium">{selectedInquiry.senderPhone}</p>
                    </div>
                  )}
                  {selectedInquiry.senderUsername && (
                    <div>
                      <span className="text-xs text-gray-500">Username:</span>
                      <p className="font-medium">@{selectedInquiry.senderUsername}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Message</h4>
                <div className="bg-white border rounded-lg p-4">
                  <p className="whitespace-pre-wrap">{selectedInquiry.message}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Received: {new Date(selectedInquiry.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Recent Messages */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Recent Messages</h4>
                <div className="bg-white border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {logsLoading ? (
                    <div className="p-3 text-sm text-gray-500">Loading…</div>
                  ) : recentLogs.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No recent messages</div>
                  ) : (
                    recentLogs.map((log: any) => (
                      <div key={log.id} className="p-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {log.direction === 'OUTBOUND' ? 'Sent' : 'Received'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.createdAt || log.sentAt || new Date()).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">
                          {log.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Reply */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">Quick Reply</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="label">Reply via</label>
                    <select
                      className="input w-full"
                      value={replyPlatform}
                      onChange={(e) => setReplyPlatform(e.target.value)}
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="TELEGRAM">Telegram</option>
                      <option value="WECHAT">WeChat</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Insert Template</label>
                    <select
                      className="input w-full"
                      value={selectedTemplateCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setSelectedTemplateCode(code);
                        const tpl = (templatesData || []).find((t: MessageTemplate) => t.code === code);
                        if (tpl) {
                          setReplyBody(prev => prev ? prev + '\n\n' + tpl.body : tpl.body);
                        }
                      }}
                    >
                      <option value="">Select a template…</option>
                      {(templatesData || []).map((t: MessageTemplate) => (
                        <option key={t.code} value={t.code}>
                          {t.name} {t.platform ? `(${t.platform})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <textarea
                  className="input w-full min-h-[120px]"
                  placeholder="Type your reply…"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                />
                <div className="flex items-center flex-wrap gap-2">
                  {detectedVariables.length > 0 ? (
                    detectedVariables.map((v) => (
                      <span
                        key={v}
                        className={`badge ${
                          knownPlaceholders.includes(v) ? 'badge-success' : 'badge-warning'
                        }`}
                        title={
                          knownPlaceholders.includes(v)
                            ? 'Known placeholder'
                            : 'Unknown placeholder'
                        }
                      >
                        {`{{${v}}}`}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">
                      No placeholders detected. Supported: {knownPlaceholders.join(', ')}.
                    </span>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    className="btn btn-primary"
                    disabled={sendReplyMutation.isPending || !replyBody.trim()}
                    onClick={() => {
                      sendReplyMutation.mutate({
                        platform: replyPlatform,
                        recipientPhone: selectedInquiry.senderPhone,
                        message: replyBody.trim(),
                        customerId: selectedInquiry.customerId,
                      });
                    }}
                  >
                    {sendReplyMutation.isPending ? 'Sending…' : 'Send Reply'}
                  </button>
                </div>
              </div>

              {/* Follow-up */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">Follow-up Reminder</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="label">Follow-up Date</label>
                    <input
                      type="datetime-local"
                      className="input w-full"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Note</label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="E.g., call customer to confirm order"
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    className="btn btn-secondary"
                    disabled={followUpMutation.isPending || !followUpDate}
                    onClick={() => {
                      followUpMutation.mutate({
                        id: selectedInquiry.id,
                        activityDate: followUpDate,
                        note: followUpNote,
                      });
                    }}
                  >
                    {followUpMutation.isPending ? 'Scheduling…' : 'Schedule Follow-up'}
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`badge ${statusBadges[selectedInquiry.status] || 'badge-gray'}`}>
                  {selectedInquiry.status}
                </span>
                {selectedInquiry.crmLeadId && (
                  <span className="text-sm text-green-600">
                    → Lead #{selectedInquiry.crmLeadId}
                  </span>
                )}
                {selectedInquiry.customerId && (
                  <span className="text-sm text-blue-600">
                    → Customer #{selectedInquiry.customerId}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                {selectedInquiry.status === 'NEW' && !selectedInquiry.crmLeadId && (
                  <button
                    onClick={() => convertToLeadMutation.mutate(selectedInquiry.id)}
                    disabled={convertToLeadMutation.isPending}
                    className="btn btn-primary"
                  >
                    <UserPlusIcon className="w-4 h-4 mr-1" />
                    {convertToLeadMutation.isPending ? 'Converting...' : 'Convert to Lead'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
