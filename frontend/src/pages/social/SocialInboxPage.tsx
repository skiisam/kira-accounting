import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface SocialMessage {
  id: string;
  platform: 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'xiaohongshu';
  senderName: string;
  senderHandle: string;
  senderAvatar?: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isReplied: boolean;
  customerId?: number;
  threadMessages?: { from: 'customer' | 'agent'; message: string; timestamp: Date }[];
}

const platformConfig = {
  facebook: { icon: '📘', color: 'bg-blue-500', name: 'Facebook' },
  instagram: { icon: '📸', color: 'bg-gradient-to-br from-pink-500 to-purple-500', name: 'Instagram' },
  tiktok: { icon: '🎵', color: 'bg-gray-900', name: 'TikTok' },
  twitter: { icon: '𝕏', color: 'bg-black', name: 'X' },
  xiaohongshu: { icon: '📕', color: 'bg-red-500', name: '小红书' },
};

// Mock data for demonstration
const mockMessages: SocialMessage[] = [
  {
    id: '1',
    platform: 'facebook',
    senderName: 'John Tan',
    senderHandle: 'john.tan.123',
    message: 'Hi, I saw your product on Facebook. Can you tell me more about the pricing for bulk orders?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
    isRead: false,
    isReplied: false,
    threadMessages: [
      { from: 'customer', message: 'Hi, I saw your product on Facebook. Can you tell me more about the pricing for bulk orders?', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
    ],
  },
  {
    id: '2',
    platform: 'instagram',
    senderName: 'Sarah Lee',
    senderHandle: 'sarah_lee_my',
    message: 'Love your products! 😍 Do you ship to Penang?',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    isRead: true,
    isReplied: false,
    threadMessages: [
      { from: 'customer', message: 'Love your products! 😍 Do you ship to Penang?', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    ],
  },
  {
    id: '3',
    platform: 'xiaohongshu',
    senderName: '小美',
    senderHandle: 'xiaomei888',
    message: '你好！请问这个产品有中文说明书吗？',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    isRead: true,
    isReplied: true,
    customerId: 1,
    threadMessages: [
      { from: 'customer', message: '你好！请问这个产品有中文说明书吗？', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
      { from: 'agent', message: '您好！是的，我们的产品都有中英文说明书。请问您需要哪款产品呢？', timestamp: new Date(Date.now() - 1000 * 60 * 45) },
    ],
  },
  {
    id: '4',
    platform: 'tiktok',
    senderName: 'TikTok User',
    senderHandle: 'user_12345',
    message: 'Saw your video! Where can I buy this?',
    timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    isRead: true,
    isReplied: true,
    threadMessages: [
      { from: 'customer', message: 'Saw your video! Where can I buy this?', timestamp: new Date(Date.now() - 1000 * 60 * 120) },
      { from: 'agent', message: 'Thanks for your interest! You can order directly from our website or WhatsApp us at +60123456789', timestamp: new Date(Date.now() - 1000 * 60 * 100) },
    ],
  },
  {
    id: '5',
    platform: 'twitter',
    senderName: 'Mike Wong',
    senderHandle: '@mikewong_kl',
    message: 'Great service! Will definitely order again 👍',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    isRead: true,
    isReplied: true,
    customerId: 2,
    threadMessages: [
      { from: 'customer', message: 'Great service! Will definitely order again 👍', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
      { from: 'agent', message: 'Thank you Mike! We appreciate your support! 🙏', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23) },
    ],
  },
];

function MessageItem({ message, isSelected, onClick }: {
  message: SocialMessage;
  isSelected: boolean;
  onClick: () => void;
}) {
  const platform = platformConfig[message.platform];
  const timeAgo = getTimeAgo(message.timestamp);

  return (
    <div
      className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
        isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-500' : ''
      } ${!message.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${platform.color} flex items-center justify-center text-white text-lg flex-shrink-0`}>
          {platform.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${!message.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                {message.senderName}
              </span>
              <span className="text-xs text-gray-500">@{message.senderHandle}</span>
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">{timeAgo}</span>
          </div>
          <p className={`text-sm mt-1 truncate ${!message.isRead ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
            {message.message}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${platform.color} text-white`}>
              {platform.name}
            </span>
            {message.isReplied && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Replied
              </span>
            )}
            {message.customerId && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                CRM Linked
              </span>
            )}
            {!message.isRead && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function SocialInboxPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SocialMessage[]>(mockMessages);
  const [selectedMessage, setSelectedMessage] = useState<SocialMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'unreplied'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [showConvertModal, setShowConvertModal] = useState(false);

  const filteredMessages = messages.filter(m => {
    if (filter === 'unread' && m.isRead) return false;
    if (filter === 'unreplied' && m.isReplied) return false;
    if (platformFilter !== 'all' && m.platform !== platformFilter) return false;
    return true;
  });

  const handleSelectMessage = (message: SocialMessage) => {
    setSelectedMessage(message);
    setReplyText('');
    // Mark as read
    setMessages(prev => prev.map(m => 
      m.id === message.id ? { ...m, isRead: true } : m
    ));
  };

  const handleSendReply = () => {
    if (!selectedMessage || !replyText.trim()) return;

    // Add reply to thread
    const updatedMessage = {
      ...selectedMessage,
      isReplied: true,
      threadMessages: [
        ...(selectedMessage.threadMessages || []),
        { from: 'agent' as const, message: replyText, timestamp: new Date() },
      ],
    };

    setMessages(prev => prev.map(m => 
      m.id === selectedMessage.id ? updatedMessage : m
    ));
    setSelectedMessage(updatedMessage);
    setReplyText('');
    toast.success('Reply sent!');
  };

  const handleConvertToLead = () => {
    if (!selectedMessage) return;
    
    // Simulate conversion
    setMessages(prev => prev.map(m => 
      m.id === selectedMessage.id ? { ...m, customerId: 999 } : m
    ));
    setSelectedMessage({ ...selectedMessage, customerId: 999 });
    setShowConvertModal(false);
    toast.success('Converted to CRM lead!');
  };

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Inbox</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread messages` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input py-2 text-sm"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="all">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="twitter">X / Twitter</option>
            <option value="xiaohongshu">小红书</option>
          </select>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            {['all', 'unread', 'unreplied'].map((f) => (
              <button
                key={f}
                className={`px-3 py-2 text-sm capitalize ${
                  filter === f 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => setFilter(f as any)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100%-4rem)] gap-4">
        {/* Message List */}
        <div className="w-1/3 card overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <span className="text-4xl">📭</span>
                <p className="mt-2">No messages found</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isSelected={selectedMessage?.id === message.id}
                  onClick={() => handleSelectMessage(message)}
                />
              ))
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="flex-1 card overflow-hidden flex flex-col">
          {selectedMessage ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${platformConfig[selectedMessage.platform].color} flex items-center justify-center text-white text-xl`}>
                      {platformConfig[selectedMessage.platform].icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{selectedMessage.senderName}</h3>
                      <p className="text-sm text-gray-500">@{selectedMessage.senderHandle} • {platformConfig[selectedMessage.platform].name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedMessage.customerId ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/customers/${selectedMessage.customerId}`)}
                      >
                        View Customer
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowConvertModal(true)}
                      >
                        Convert to Lead
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                {selectedMessage.threadMessages?.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.from === 'agent'
                          ? 'bg-primary-500 text-white rounded-br-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm shadow'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.from === 'agent' ? 'text-primary-200' : 'text-gray-500'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                  >
                    Send
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Reply will be sent via {platformConfig[selectedMessage.platform].name}
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <span className="text-6xl">💬</span>
                <p className="mt-4 text-lg">Select a message to view</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Convert to Lead Modal */}
      {showConvertModal && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="card-body space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Convert to CRM Lead
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create a new lead/customer from this social media contact:
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="label">Name</label>
                  <input className="input" defaultValue={selectedMessage.senderName} />
                </div>
                <div>
                  <label className="label">Social Handle</label>
                  <input className="input" defaultValue={`@${selectedMessage.senderHandle}`} disabled />
                </div>
                <div>
                  <label className="label">Platform</label>
                  <input className="input" defaultValue={platformConfig[selectedMessage.platform].name} disabled />
                </div>
                <div>
                  <label className="label">Lead Source</label>
                  <select className="input">
                    <option>Social Media Inquiry</option>
                    <option>Product Interest</option>
                    <option>Support Request</option>
                  </select>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea 
                    className="input" 
                    rows={3}
                    defaultValue={`Initial message: "${selectedMessage.message}"`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowConvertModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConvertToLead}
                >
                  Create Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
