import { useState } from 'react';
import toast from 'react-hot-toast';

interface SocialPlatform {
  id: string;
  name: string;
  nameCn?: string;
  icon: string;
  color: string;
  connected: boolean;
  account?: string;
  followers?: number;
}

const initialPlatforms: SocialPlatform[] = [
  {
    id: 'facebook',
    name: 'Facebook Page',
    icon: '📘',
    color: 'from-blue-600 to-blue-500',
    connected: false,
  },
  {
    id: 'instagram',
    name: 'Instagram Business',
    icon: '📸',
    color: 'from-pink-500 to-purple-500',
    connected: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: 'from-gray-900 to-gray-700',
    connected: false,
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    icon: '𝕏',
    color: 'from-gray-800 to-black',
    connected: false,
  },
  {
    id: 'xiaohongshu',
    name: '小红书 Xiaohongshu',
    nameCn: '小红书',
    icon: '📕',
    color: 'from-red-500 to-red-600',
    connected: false,
  },
];

function PlatformCard({ platform, onConnect, onDisconnect }: {
  platform: SocialPlatform;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl shadow-lg`}>
              {platform.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{platform.name}</h3>
              {platform.connected ? (
                <div className="mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{platform.account}</span>
                  {platform.followers && (
                    <span className="ml-2 text-xs text-gray-500">• {platform.followers.toLocaleString()} followers</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Not connected</p>
              )}
            </div>
          </div>
          <div>
            {platform.connected ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                  Connected
                </span>
                <button
                  onClick={onDisconnect}
                  className="btn btn-secondary btn-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                className={`btn btn-sm text-white bg-gradient-to-r ${platform.color} hover:opacity-90`}
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {platform.connected && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
                <p className="text-xs text-gray-500">Messages Today</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
                <p className="text-xs text-gray-500">Avg Response</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
                <p className="text-xs text-gray-500">Leads Generated</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SocialSettingsPage() {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(initialPlatforms);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);

  const handleConnect = (platform: SocialPlatform) => {
    setSelectedPlatform(platform);
    setShowConnectModal(true);
  };

  const handleConfirmConnect = () => {
    if (!selectedPlatform) return;
    
    // Simulate connection (placeholder)
    setPlatforms(prev => prev.map(p => 
      p.id === selectedPlatform.id 
        ? { 
            ...p, 
            connected: true, 
            account: `@demo_${p.id}_account`,
            followers: Math.floor(Math.random() * 10000) + 1000
          }
        : p
    ));
    
    toast.success(`Connected to ${selectedPlatform.name}!`);
    setShowConnectModal(false);
    setSelectedPlatform(null);
  };

  const handleDisconnect = (platformId: string) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId 
        ? { ...p, connected: false, account: undefined, followers: undefined }
        : p
    ));
    toast.success('Platform disconnected');
  };

  const connectedCount = platforms.filter(p => p.connected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Media Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Connect your social media accounts to receive and respond to customer messages
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500">Connected Platforms</span>
          <p className="text-2xl font-bold text-primary-600">{connectedCount} / {platforms.length}</p>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {platforms.map((platform) => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            onConnect={() => handleConnect(platform)}
            onDisconnect={() => handleDisconnect(platform.id)}
          />
        ))}
      </div>

      {/* Integration Info */}
      <div className="card bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
        <div className="card-body">
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
            <span className="text-xl">💡</span> About Social Media Integration
          </h3>
          <div className="mt-2 text-sm text-indigo-700 dark:text-indigo-300 space-y-2">
            <p>Once connected, you can:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Receive all customer messages in the unified Social Inbox</li>
              <li>Reply to messages directly from KIRA</li>
              <li>Convert inquiries into CRM leads with one click</li>
              <li>Track all social interactions in customer profiles</li>
              <li>Get analytics on response times and message volume</li>
            </ul>
            <p className="mt-3 text-xs opacity-75">
              Note: This is a placeholder integration. Actual API connections require OAuth setup with each platform.
            </p>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && selectedPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="card-body space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedPlatform.color} flex items-center justify-center text-xl shadow-lg`}>
                  {selectedPlatform.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Connect {selectedPlatform.name}
                  </h3>
                  <p className="text-sm text-gray-500">Authorize KIRA to access your account</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Clicking "Authorize" will redirect you to {selectedPlatform.name} to:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Read and respond to messages
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Access page/profile information
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> View follower statistics
                  </li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowConnectModal(false);
                    setSelectedPlatform(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`btn text-white bg-gradient-to-r ${selectedPlatform.color} hover:opacity-90`}
                  onClick={handleConfirmConnect}
                >
                  Authorize & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
