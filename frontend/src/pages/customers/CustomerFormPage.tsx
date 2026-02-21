import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post, put } from '../../services/api';

// Social platform config
const socialPlatforms = [
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-500', placeholder: 'facebook.com/username' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-gradient-to-br from-pink-500 to-purple-500', placeholder: '@username' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-gray-900', placeholder: '@username' },
  { id: 'twitter', name: 'X / Twitter', icon: '𝕏', color: 'bg-black', placeholder: '@username' },
  { id: 'xiaohongshu', name: '小红书', icon: '📕', color: 'bg-red-500', placeholder: 'User ID' },
];

// Mock social activities for demo
const mockSocialActivities = [
  { id: 1, platform: 'facebook', type: 'message', message: 'Asked about bulk pricing', date: '2024-02-21 14:30', agent: 'Admin' },
  { id: 2, platform: 'instagram', type: 'message', message: 'Interested in new product line', date: '2024-02-20 10:15', agent: 'Admin' },
  { id: 3, platform: 'xiaohongshu', type: 'inquiry', message: 'Requested Chinese product manual', date: '2024-02-18 16:45', agent: 'Admin' },
];

interface SocialProfile {
  platform: string;
  handle: string;
}

interface CustomerForm {
  code: string;
  name: string;
  name2?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  address4?: string;
  postcode?: string;
  city?: string;
  state?: string;
  country?: string;
  contactPerson?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  businessRegNo?: string;
  taxRegNo?: string;
  currencyCode: string;
  creditTermDays: number;
  creditLimit: number;
  salesAgentId?: number;
  areaId?: number;
  taxCode?: string;
  notes?: string;
}

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Social profiles state (placeholder - would be part of customer data in real implementation)
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([]);
  const [showSocialActivities, setShowSocialActivities] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerForm>({
    defaultValues: {
      currencyCode: 'MYR',
      creditTermDays: 30,
      creditLimit: 0,
      country: 'Malaysia',
    },
  });

  const handleAddSocialProfile = (platform: string, handle: string) => {
    if (!handle.trim()) return;
    setSocialProfiles(prev => [...prev.filter(p => p.platform !== platform), { platform, handle }]);
    toast.success(`${platform} profile added`);
  };

  const handleRemoveSocialProfile = (platform: string) => {
    setSocialProfiles(prev => prev.filter(p => p.platform !== platform));
  };

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => get<CustomerForm>(`/customers/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (customer) {
      reset(customer);
    }
  }, [customer, reset]);

  const mutation = useMutation({
    mutationFn: (data: CustomerForm) =>
      isEdit ? put(`/customers/${id}`, data) : post('/customers', { ...data, controlAccountId: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(isEdit ? 'Customer updated' : 'Customer created');
      navigate('/customers');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Operation failed');
    },
  });

  if (isEdit && isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Customer' : 'New Customer'}
        </h1>
{/* Send Statement button removed temporarily */}
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Basic Information</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="label">Customer Code *</label>
              <input
                {...register('code', { required: 'Code is required' })}
                className={`input ${errors.code ? 'input-error' : ''}`}
                disabled={isEdit}
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Company Name *</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className={`input ${errors.name ? 'input-error' : ''}`}
              />
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input {...register('contactPerson')} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input" />
            </div>
            <div>
              <label className="label">Mobile</label>
              <input {...register('mobile')} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" />
            </div>
            <div>
              <label className="label">Business Reg No</label>
              <input {...register('businessRegNo')} className="input" />
            </div>
            <div>
              <label className="label">Tax Reg No</label>
              <input {...register('taxRegNo')} className="input" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Address</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Address Line 1</label>
              <input {...register('address1')} className="input" />
            </div>
            <div>
              <label className="label">Address Line 2</label>
              <input {...register('address2')} className="input" />
            </div>
            <div>
              <label className="label">Address Line 3</label>
              <input {...register('address3')} className="input" />
            </div>
            <div>
              <label className="label">Address Line 4</label>
              <input {...register('address4')} className="input" />
            </div>
            <div>
              <label className="label">Postcode</label>
              <input {...register('postcode')} className="input" />
            </div>
            <div>
              <label className="label">City</label>
              <input {...register('city')} className="input" />
            </div>
            <div>
              <label className="label">State</label>
              <input {...register('state')} className="input" />
            </div>
            <div>
              <label className="label">Country</label>
              <input {...register('country')} className="input" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Credit Control</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="label">Currency</label>
              <select {...register('currencyCode')} className="input">
                <option value="MYR">MYR - Malaysian Ringgit</option>
                <option value="USD">USD - US Dollar</option>
                <option value="SGD">SGD - Singapore Dollar</option>
              </select>
            </div>
            <div>
              <label className="label">Credit Term (Days)</label>
              <input {...register('creditTermDays', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Credit Limit</label>
              <input {...register('creditLimit', { valueAsNumber: true })} type="number" step="0.01" className="input" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Notes</h2>
          </div>
          <div className="card-body">
            <textarea {...register('notes')} rows={4} className="input" />
          </div>
        </div>

        {/* Social Media Profiles */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">💬</span> Social Media Profiles
            </h2>
            {socialProfiles.length > 0 && (
              <span className="text-sm text-gray-500">{socialProfiles.length} connected</span>
            )}
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {socialPlatforms.map((platform) => {
                const profile = socialProfiles.find(p => p.platform === platform.id);
                return (
                  <div key={platform.id} className="relative">
                    <label className="label flex items-center gap-2">
                      <span className={`w-6 h-6 rounded ${platform.color} flex items-center justify-center text-white text-xs`}>
                        {platform.icon}
                      </span>
                      {platform.name}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder={platform.placeholder}
                        defaultValue={profile?.handle || ''}
                        onBlur={(e) => {
                          if (e.target.value) {
                            handleAddSocialProfile(platform.id, e.target.value);
                          }
                        }}
                      />
                      {profile && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSocialProfile(platform.id)}
                          className="btn btn-secondary btn-sm text-red-500 hover:text-red-700"
                          title="Remove"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Link social media accounts to track interactions and enable social CRM features.
            </p>
          </div>
        </div>

        {/* Social Activities - Only show when editing existing customer */}
        {isEdit && (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-xl">📊</span> Social Interactions
              </h2>
              <button
                type="button"
                onClick={() => setShowSocialActivities(!showSocialActivities)}
                className="btn btn-secondary btn-sm"
              >
                {showSocialActivities ? 'Hide' : 'Show'} History
              </button>
            </div>
            {showSocialActivities && (
              <div className="card-body">
                <div className="space-y-3">
                  {mockSocialActivities.length > 0 ? (
                    mockSocialActivities.map((activity) => {
                      const platform = socialPlatforms.find(p => p.id === activity.platform);
                      return (
                        <div 
                          key={activity.id} 
                          className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <span className={`w-8 h-8 rounded-full ${platform?.color || 'bg-gray-500'} flex items-center justify-center text-white text-sm flex-shrink-0`}>
                            {platform?.icon || '💬'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                {activity.type} via {platform?.name}
                              </span>
                              <span className="text-xs text-gray-500">{activity.date}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {activity.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Handled by: {activity.agent}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <span className="text-3xl">📭</span>
                      <p className="mt-2">No social interactions recorded</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Total interactions: {mockSocialActivities.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/social/inbox')}
                    className="btn btn-primary btn-sm"
                  >
                    View in Social Inbox
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/customers')} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </form>

      {/* Send Statement Dialog - placeholder */}
    </div>
  );
}
