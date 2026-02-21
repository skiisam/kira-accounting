import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  ChatBubbleLeftRightIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface MessagingConfig {
  id?: number;
  platform: string;
  whatsappPhoneNumber?: string;
  whatsappApiToken?: string;
  whatsappBusinessId?: string;
  telegramBotToken?: string;
  telegramBotUsername?: string;
  wechatAppId?: string;
  wechatAppSecret?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  isEnabled: boolean;
  isVerified: boolean;
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

const templateCategories = [
  { value: 'INVOICE', label: 'Invoice Notification' },
  { value: 'STATEMENT', label: 'Customer Statement' },
  { value: 'PAYMENT_REMINDER', label: 'Payment Reminder' },
  { value: 'RECEIPT', label: 'Payment Receipt' },
  { value: 'WELCOME', label: 'Welcome Message' },
  { value: 'CUSTOM', label: 'Custom' },
];

const templatePlaceholders = [
  { name: 'customerName', desc: 'Customer name' },
  { name: 'documentNo', desc: 'Document number' },
  { name: 'amount', desc: 'Amount' },
  { name: 'dueDate', desc: 'Due date' },
  { name: 'companyName', desc: 'Company name' },
  { name: 'invoiceDate', desc: 'Invoice date' },
  { name: 'paymentDate', desc: 'Payment date' },
  { name: 'outstandingAmount', desc: 'Outstanding amount' },
  { name: 'daysOverdue', desc: 'Days overdue' },
];

export default function MessagingSettingsPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'logs'>('config');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary-600" />
        <h2 className="text-lg font-semibold">Messaging Integration</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'config', label: 'Configuration' },
            { key: 'templates', label: 'Message Templates' },
            { key: 'logs', label: 'Message Logs' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'config' && <ConfigurationTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'logs' && <LogsTab />}
    </div>
  );
}

function ConfigurationTab() {
  const queryClient = useQueryClient();
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});

  const { data: configs, isLoading } = useQuery({
    queryKey: ['messaging-configs'],
    queryFn: () => get<MessagingConfig[]>('/messaging/config'),
  });

  // Initialize default configs if not exists
  const allConfigs: MessagingConfig[] = ['WHATSAPP', 'TELEGRAM', 'WECHAT'].map((platform) => {
    const existing = (configs || []).find((c) => c.platform === platform);
    return existing || { platform, isEnabled: false, isVerified: false };
  });

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        allConfigs.map((config) => (
          <PlatformConfigCard
            key={config.platform}
            config={config}
            showToken={showToken[config.platform]}
            onToggleShowToken={() =>
              setShowToken((prev) => ({ ...prev, [config.platform]: !prev[config.platform] }))
            }
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['messaging-configs'] })}
          />
        ))
      )}
    </div>
  );
}

function PlatformConfigCard({
  config,
  showToken,
  onToggleShowToken,
  onSaved,
}: {
  config: MessagingConfig;
  showToken: boolean;
  onToggleShowToken: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(config);

  const mutation = useMutation({
    mutationFn: (data: any) => post(`/messaging/config/${config.platform}`, data),
    onSuccess: () => {
      toast.success('Configuration saved');
      setEditing(false);
      onSaved();
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to save'),
  });

  const handleSave = () => {
    mutation.mutate(formData);
  };

  const platformLabels: Record<string, string> = {
    WHATSAPP: 'WhatsApp Business',
    TELEGRAM: 'Telegram Bot',
    WECHAT: 'WeChat Official Account',
  };

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{platformIcons[config.platform]}</span>
          <div>
            <h3 className="font-semibold">{platformLabels[config.platform]}</h3>
            <div className="flex items-center gap-2 text-sm">
              {config.isEnabled ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircleIcon className="w-4 h-4" /> Enabled
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400">
                  <XCircleIcon className="w-4 h-4" /> Disabled
                </span>
              )}
              {config.isVerified && (
                <span className="badge badge-success text-xs">Verified</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="btn btn-secondary btn-sm"
        >
          {editing ? 'Cancel' : 'Configure'}
        </button>
      </div>

      {editing && (
        <div className="card-body space-y-4">
          {/* WhatsApp Fields */}
          {config.platform === 'WHATSAPP' && (
            <>
              <div>
                <label className="label">Phone Number (with country code)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="+60123456789"
                  value={formData.whatsappPhoneNumber || ''}
                  onChange={(e) => setFormData({ ...formData, whatsappPhoneNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Business Account ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Your WhatsApp Business ID"
                  value={formData.whatsappBusinessId || ''}
                  onChange={(e) => setFormData({ ...formData, whatsappBusinessId: e.target.value })}
                />
              </div>
              <div>
                <label className="label">API Token</label>
                <div className="flex gap-2">
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="input flex-1"
                    placeholder="Your WhatsApp Business API token"
                    value={formData.whatsappApiToken || ''}
                    onChange={(e) => setFormData({ ...formData, whatsappApiToken: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={onToggleShowToken}
                    className="btn btn-secondary px-3"
                  >
                    {showToken ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Telegram Fields */}
          {config.platform === 'TELEGRAM' && (
            <>
              <div>
                <label className="label">Bot Username</label>
                <input
                  type="text"
                  className="input"
                  placeholder="@YourBotUsername"
                  value={formData.telegramBotUsername || ''}
                  onChange={(e) => setFormData({ ...formData, telegramBotUsername: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Bot Token</label>
                <div className="flex gap-2">
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="input flex-1"
                    placeholder="Your Telegram Bot token from @BotFather"
                    value={formData.telegramBotToken || ''}
                    onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={onToggleShowToken}
                    className="btn btn-secondary px-3"
                  >
                    {showToken ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* WeChat Fields */}
          {config.platform === 'WECHAT' && (
            <>
              <div>
                <label className="label">App ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Your WeChat App ID"
                  value={formData.wechatAppId || ''}
                  onChange={(e) => setFormData({ ...formData, wechatAppId: e.target.value })}
                />
              </div>
              <div>
                <label className="label">App Secret</label>
                <div className="flex gap-2">
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="input flex-1"
                    placeholder="Your WeChat App Secret"
                    value={formData.wechatAppSecret || ''}
                    onChange={(e) => setFormData({ ...formData, wechatAppSecret: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={onToggleShowToken}
                    className="btn btn-secondary px-3"
                  >
                    {showToken ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Webhook URL (read-only) */}
          <div>
            <label className="label">Webhook URL (for receiving messages)</label>
            <input
              type="text"
              className="input bg-gray-50"
              readOnly
              value={`${window.location.origin}/api/v1/messaging/webhook/${config.platform.toLowerCase()}`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Configure this URL in your {platformLabels[config.platform]} dashboard
            </p>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isEnabled}
                onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-900">
              Enable {platformLabels[config.platform]}
            </span>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="btn btn-primary"
            >
              {mutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplatesTab() {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['message-templates'],
    queryFn: () => get<MessageTemplate[]>('/messaging/templates'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: MessageTemplate) => post('/messaging/templates', data),
    onSuccess: () => {
      toast.success('Template saved');
      setShowModal(false);
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/messaging/templates/${id}`),
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to delete'),
  });

  const openNewTemplate = () => {
    setEditingTemplate({
      code: '',
      name: '',
      category: 'CUSTOM',
      body: '',
      isDefault: false,
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Create message templates with placeholders like <code className="bg-gray-100 px-1 rounded">{'{{customerName}}'}</code>
        </p>
        <button onClick={openNewTemplate} className="btn btn-primary btn-sm">
          <PlusIcon className="w-4 h-4 mr-1" />
          New Template
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {(templates || []).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No templates yet. Create your first message template.
            </div>
          ) : (
            (templates || []).map((template) => (
              <div key={template.id} className="card">
                <div className="card-body flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.name}</span>
                      <span className="badge badge-info text-xs">{template.category}</span>
                      {template.isDefault && (
                        <span className="badge badge-success text-xs">Default</span>
                      )}
                      {!template.isActive && (
                        <span className="badge badge-warning text-xs">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Code: {template.code}</p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{template.body}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditTemplate(template)}
                      className="btn btn-secondary btn-sm"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this template?')) {
                          deleteMutation.mutate(template.id!);
                        }
                      }}
                      className="btn btn-danger btn-sm"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Template Edit Modal */}
      {showModal && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="card-header">
              <h3 className="text-lg font-semibold">
                {editingTemplate.id ? 'Edit Template' : 'New Template'}
              </h3>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Template Code *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="INVOICE_NOTIFICATION"
                    value={editingTemplate.code}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, code: e.target.value.toUpperCase().replace(/\s/g, '_') })
                    }
                  />
                </div>
                <div>
                  <label className="label">Template Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Invoice Notification"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category *</label>
                  <select
                    className="input"
                    value={editingTemplate.category}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, category: e.target.value })
                    }
                  >
                    {templateCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Platform (optional)</label>
                  <select
                    className="input"
                    value={editingTemplate.platform || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, platform: e.target.value || undefined })
                    }
                  >
                    <option value="">All Platforms</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="TELEGRAM">Telegram</option>
                    <option value="WECHAT">WeChat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Subject (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Invoice #{{documentNo}} Ready"
                  value={editingTemplate.subject || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Message Body *</label>
                <textarea
                  className="input min-h-[150px]"
                  placeholder="Dear {{customerName}}, your invoice {{documentNo}} for {{amount}} is ready..."
                  value={editingTemplate.body}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, body: e.target.value })
                  }
                />
              </div>

              {/* Placeholders Reference */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-gray-600 mb-2">Available Placeholders:</p>
                <div className="flex flex-wrap gap-2">
                  {templatePlaceholders.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        setEditingTemplate({
                          ...editingTemplate,
                          body: editingTemplate.body + `{{${p.name}}}`,
                        })
                      }
                      className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100"
                      title={p.desc}
                    >
                      {`{{${p.name}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.isDefault}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, isDefault: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Set as default for category</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.isActive}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingTemplate(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveMutation.mutate(editingTemplate)}
                  disabled={saveMutation.isPending || !editingTemplate.code || !editingTemplate.name || !editingTemplate.body}
                  className="btn btn-primary"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogsTab() {
  const [platform, setPlatform] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['message-logs', platform, page],
    queryFn: () => get<any>(`/messaging/logs?page=${page}&pageSize=20${platform ? `&platform=${platform}` : ''}`),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const statusBadges: Record<string, string> = {
    PENDING: 'badge-warning',
    SENT: 'badge-info',
    DELIVERED: 'badge-success',
    READ: 'badge-success',
    FAILED: 'badge-danger',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <select
          className="input w-auto"
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Platforms</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="TELEGRAM">Telegram</option>
          <option value="WECHAT">WeChat</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No message logs yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Platform</th>
                <th>Direction</th>
                <th>Recipient</th>
                <th>Document</th>
                <th>Status</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <span className="flex items-center gap-1">
                      {platformIcons[log.platform]} {log.platform}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${log.direction === 'OUTBOUND' ? 'badge-info' : 'badge-success'}`}>
                      {log.direction}
                    </span>
                  </td>
                  <td className="text-sm">
                    {log.recipientPhone || log.recipientName || '-'}
                  </td>
                  <td className="text-sm">
                    {log.documentType && log.documentNo
                      ? `${log.documentType}: ${log.documentNo}`
                      : '-'}
                  </td>
                  <td>
                    <span className={`badge ${statusBadges[log.status] || 'badge-gray'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="text-sm max-w-xs truncate" title={log.body}>
                    {log.body?.substring(0, 50)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn btn-secondary btn-sm"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.totalPages}
            className="btn btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
