import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from '@shared/hooks/useToast';
import {
  User,
  Mail,
  Phone,
  Camera,
  Save,
  X,
  Lock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Activity,
  Download,
  Trash2,
  Loader2,
  Bell,
  Eye,
  EyeOff,
  QrCode,
  Key,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useTheme } from '../../contexts/ThemeContext';
// Import shared components
import { Button, Input, Card, CardContent, CardHeader } from '@shared';

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  phone: z.string().max(50, 'Phone number is too long').optional().or(z.literal('')),
  avatar_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, setUser, isAuthenticated, accessToken, _hasHydrated, organization } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const { isOrganizationOwner, hasPermission } = usePermissions();
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showMfaManage, setShowMfaManage] = useState(false);
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await api.get('/users/me');
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile?.first_name || user?.first_name || '',
      last_name: profile?.last_name || user?.last_name || '',
      phone: profile?.phone || '',
      avatar_url: profile?.avatar_url || user?.avatar_url || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile, reset]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await api.put('/users/me', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setUser({
        id: data.id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        avatar_url: data.avatar_url,
      });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    reset({
      first_name: profile?.first_name || user?.first_name || '',
      last_name: profile?.last_name || user?.last_name || '',
      phone: profile?.phone || '',
      avatar_url: profile?.avatar_url || user?.avatar_url || '',
    });
    setIsEditing(false);
  };

  const handleViewActivityLog = () => {
    // Navigate to audit logs filtered for current user
    navigate('/audit-logs', { state: { userId: user?.id } });
  };

  const handleDownloadData = async () => {
    if (!isOrganizationOwner) {
      toast.error('Only organization owners can download account data');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await api.get('/users/me/download-data', {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `account-data-${user?.id}-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Account data downloaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to download account data');
    } finally {
      setIsDownloading(false);
    }
  };

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormData) => {
      const response = await api.put('/users/me/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      return response.data;
    },
    onSuccess: () => {
      resetPassword();
      setShowChangePassword(false);
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  const onPasswordSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  // Initialize MFA setup
  const initializeMfaMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/mfa/setup/initialize');
      return response.data;
    },
    onSuccess: (data) => {
      if (data.temp_setup_token) {
        localStorage.setItem('mfa_setup_token', data.temp_setup_token);
      }
      setShowMfaSetup(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to initialize MFA setup');
    },
  });

  // Personal notification preferences
  const { data: personalNotificationPrefs, isLoading: isLoadingPersonalPrefs } = useQuery({
    queryKey: ['notification-preferences', 'personal'],
    queryFn: async () => {
      const response = await api.get('/notifications/preferences', {
        params: { scope: 'personal' },
      });
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  const updatePersonalNotificationPrefsMutation = useMutation({
    mutationFn: async (data: {
      email_enabled?: boolean;
      in_app_enabled?: boolean;
      preferences?: Record<string, { email: boolean; in_app: boolean }>;
    }) => {
      const response = await api.put('/notifications/preferences', {
        ...data,
        scope: 'personal',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', 'personal'] });
      toast.success('Notification preferences updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update notification preferences');
    },
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-64 rounded" style={{ backgroundColor: theme.colors.surface }}></div>
      </Card>
    );
  }

  const displayUser = profile || user;
  const initials = `${displayUser?.first_name?.[0] || ''}${displayUser?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="w-full p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.primary }}>
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Profile</h1>
            <p className="mt-2 text-sm sm:text-base" style={{ color: theme.colors.textSecondary }}>Manage your account information and preferences</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Personal Information</h2>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="secondary"
                >
                  Edit Profile
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center space-x-6 mb-6">
                  <div className="flex-shrink-0">
                    {displayUser?.avatar_url ? (
                      <img
                        src={displayUser.avatar_url}
                        alt={`${displayUser.first_name} ${displayUser.last_name}`}
                        className="h-24 w-24 rounded-full object-cover border-2"
                        style={{ borderColor: theme.colors.border }}
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full flex items-center justify-center border-2" style={{ backgroundColor: theme.colors.primary + '33', borderColor: theme.colors.border }}>
                        <span className="text-2xl font-semibold" style={{ color: theme.colors.primary }}>
                          {initials}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#b9bbbe] mb-2">
                      Avatar URL
                    </label>
                    <Input
                      type="url"
                      {...register('avatar_url')}
                      placeholder="https://example.com/avatar.jpg"
                      leftIcon={<Camera className="h-5 w-5" />}
                      error={errors.avatar_url?.message}
                      fullWidth
                    />
                    <p className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                      Enter a URL to your profile picture
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="First Name *"
                      id="first_name"
                      type="text"
                      {...register('first_name')}
                      leftIcon={<User className="h-5 w-5" />}
                      error={errors.first_name?.message}
                      fullWidth
                    />
                  </div>

                  <div>
                    <Input
                      label="Last Name *"
                      id="last_name"
                      type="text"
                      {...register('last_name')}
                      leftIcon={<User className="h-5 w-5" />}
                      error={errors.last_name?.message}
                      fullWidth
                    />
                  </div>
                </div>

                <div>
                  <Input
                    label="Phone Number"
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="+1234567890"
                    leftIcon={<Phone className="h-5 w-5" />}
                    error={errors.phone?.message}
                    fullWidth
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                  <Button
                    type="button"
                    onClick={handleCancel}
                    variant="secondary"
                    disabled={updateProfileMutation.isPending}
                    leftIcon={<X className="h-4 w-4" />}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    variant="primary"
                    isLoading={updateProfileMutation.isPending}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {displayUser?.avatar_url ? (
                      <img
                        src={displayUser.avatar_url}
                        alt={`${displayUser.first_name} ${displayUser.last_name}`}
                        className="h-20 w-20 rounded-full object-cover border-2"
                        style={{ borderColor: theme.colors.border }}
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full flex items-center justify-center border-2" style={{ backgroundColor: theme.colors.primary + '33', borderColor: theme.colors.border }}>
                        <span className="text-xl font-semibold" style={{ color: theme.colors.primary }}>
                          {initials}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <dt className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Name</dt>
                    <dd className="mt-1 text-lg font-semibold text-white">
                      {displayUser?.first_name} {displayUser?.last_name}
                    </dd>
                  </div>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center mb-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </dt>
                  <dd className="text-sm text-white">{displayUser?.email}</dd>
                  {profile?.email_verified ? (
                    <div className="mt-1 flex items-center text-xs" style={{ color: theme.colors.success }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center text-xs" style={{ color: theme.colors.warning }}>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not verified
                    </div>
                  )}
                </div>

                {profile?.phone && (
                  <div>
                    <dt className="text-sm font-medium flex items-center mb-1" style={{ color: theme.colors.textSecondary }}>
                      <Phone className="h-4 w-4 mr-2" />
                      Phone Number
                    </dt>
                    <dd className="text-sm text-white">{profile.phone}</dd>
                  </div>
                )}
              </dl>
            )}
          </Card>

          {/* Security Section */}
          <Card className="mt-6">
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 mr-2" style={{ color: theme.colors.primary }} />
              <h2 className="text-lg font-semibold text-white">Security</h2>
            </div>
            <div className="space-y-4">
              {/* Change Password */}
              <div className="py-3 border-b border-[#202225]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white">Password</p>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                      Last changed: {profile?.password_changed_at ? new Date(profile.password_changed_at).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowChangePassword(!showChangePassword)}
                    variant="secondary"
                    leftIcon={<Lock className="h-4 w-4" />}
                  >
                    {showChangePassword ? 'Cancel' : 'Change Password'}
                  </Button>
                </div>
                {showChangePassword && (
                  <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="mt-4 space-y-4 p-4 rounded-lg" style={{ backgroundColor: theme.colors.surface }}>
                    <div>
                      <Input
                        label="Current Password"
                        type={showPassword.current ? 'text' : 'password'}
                        {...registerPassword('current_password')}
                        placeholder="Enter current password"
                        error={passwordErrors.current_password?.message}
                        fullWidth
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                      />
                    </div>
                    <div>
                      <Input
                        label="New Password"
                        type={showPassword.new ? 'text' : 'password'}
                        {...registerPassword('new_password')}
                        placeholder="Enter new password (min 8 characters)"
                        error={passwordErrors.new_password?.message}
                        fullWidth
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                      />
                    </div>
                    <div>
                      <Input
                        label="Confirm New Password"
                        type={showPassword.confirm ? 'text' : 'password'}
                        {...registerPassword('confirm_password')}
                        placeholder="Confirm new password"
                        error={passwordErrors.confirm_password?.message}
                        fullWidth
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                      />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => {
                          setShowChangePassword(false);
                          resetPassword();
                        }}
                        variant="secondary"
                        disabled={changePasswordMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        variant="primary"
                        isLoading={changePasswordMutation.isPending}
                      >
                        Change Password
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Two-Factor Authentication */}
              <div className="py-3 border-b" style={{ borderColor: theme.colors.border }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                    <div className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                      {profile?.mfa_enabled ? (
                        <span className="flex items-center">
                          <CheckCircle2 className="h-4 w-4 mr-1" style={{ color: theme.colors.success }} />
                          Enabled
                        </span>
                      ) : (
                        'Not enabled'
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (profile?.mfa_enabled) {
                        setShowMfaManage(!showMfaManage);
                      } else {
                        initializeMfaMutation.mutate();
                      }
                    }}
                    variant="secondary"
                    disabled={initializeMfaMutation.isPending}
                    isLoading={initializeMfaMutation.isPending}
                    leftIcon={<Shield className="h-4 w-4" />}
                  >
                    {profile?.mfa_enabled ? 'Manage 2FA' : 'Enable 2FA'}
                  </Button>
                </div>
                {showMfaSetup && initializeMfaMutation.data && (
                  <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: theme.colors.surface }}>
                    <p className="text-sm mb-4" style={{ color: theme.colors.textSecondary }}>
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                    <div className="flex justify-center mb-4">
                      <img
                        src={initializeMfaMutation.data.qr_code_url}
                        alt="MFA QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-xs mb-4 text-center" style={{ color: theme.colors.textSecondary }}>
                      Secret: {initializeMfaMutation.data.secret}
                    </p>
                    <Button
                      onClick={() => navigate('/mfa/setup')}
                      variant="primary"
                      fullWidth
                      leftIcon={<QrCode className="h-4 w-4" />}
                    >
                      Complete Setup
                    </Button>
                  </div>
                )}
                {showMfaManage && profile?.mfa_enabled && (
                  <div className="mt-4 p-4 rounded-lg space-y-3" style={{ backgroundColor: theme.colors.surface }}>
                    <Button
                      onClick={async () => {
                        try {
                          const response = await api.get('/mfa/backup-codes');
                          const codes = response.data.backup_codes;
                          alert(`Your backup codes:\n\n${codes.join('\n')}\n\nSave these codes in a safe place!`);
                        } catch (error: any) {
                          toast.error(error.response?.data?.message || 'Failed to get backup codes');
                        }
                      }}
                      variant="secondary"
                      fullWidth
                      leftIcon={<Key className="h-4 w-4" />}
                    >
                      View Backup Codes
                    </Button>
                    <Button
                      onClick={async () => {
                        const code = prompt('Enter your 2FA code to regenerate backup codes:');
                        if (code) {
                          try {
                            const response = await api.post('/mfa/backup-codes/regenerate', { code });
                            const codes = response.data.backup_codes;
                            alert(`Your new backup codes:\n\n${codes.join('\n')}\n\nSave these codes in a safe place!`);
                          } catch (error: any) {
                            toast.error(error.response?.data?.message || 'Failed to regenerate backup codes');
                          }
                        }
                      }}
                      variant="secondary"
                      fullWidth
                      leftIcon={<Key className="h-4 w-4" />}
                    >
                      Regenerate Backup Codes
                    </Button>
                  </div>
                )}
              </div>

              {/* Notification Preferences */}
              <div className="py-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white">Notification Preferences</p>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                      Manage your personal notification settings
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowNotificationPrefs(!showNotificationPrefs)}
                    variant="secondary"
                    leftIcon={<Bell className="h-4 w-4" />}
                  >
                    {showNotificationPrefs ? 'Hide' : 'Manage'}
                  </Button>
                </div>
                {showNotificationPrefs && (
                  <div className="mt-4 p-4 rounded-lg space-y-4" style={{ backgroundColor: theme.colors.surface }}>
                    {isLoadingPersonalPrefs ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" style={{ color: theme.colors.primary }} />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: theme.colors.border }}>
                          <div>
                            <p className="text-sm font-medium text-white">Email Notifications</p>
                            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>Master toggle for email notifications</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={personalNotificationPrefs?.email_enabled ?? true}
                              onChange={(e) => {
                                updatePersonalNotificationPrefsMutation.mutate({
                                  email_enabled: e.target.checked,
                                  in_app_enabled: personalNotificationPrefs?.in_app_enabled ?? true,
                                  preferences: personalNotificationPrefs?.preferences || {},
                                });
                              }}
                              disabled={updatePersonalNotificationPrefsMutation.isPending}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#4f545c] peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-primary)] peer-disabled:opacity-50" style={{ '--tw-ring-color': `${theme.colors.primary}33` } as any}></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: theme.colors.border }}>
                          <div>
                            <p className="text-sm font-medium text-white">In-App Notifications</p>
                            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>Master toggle for in-app notifications</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={personalNotificationPrefs?.in_app_enabled ?? true}
                              onChange={(e) => {
                                updatePersonalNotificationPrefsMutation.mutate({
                                  email_enabled: personalNotificationPrefs?.email_enabled ?? true,
                                  in_app_enabled: e.target.checked,
                                  preferences: personalNotificationPrefs?.preferences || {},
                                });
                              }}
                              disabled={updatePersonalNotificationPrefsMutation.isPending}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#4f545c] peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-primary)] peer-disabled:opacity-50" style={{ '--tw-ring-color': `${theme.colors.primary}33` } as any}></div>
                          </label>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-medium uppercase" style={{ color: theme.colors.textSecondary }}>Notification Types</p>
                          {['user_invitations', 'role_changes', 'security_alerts'].map((type) => (
                            <div key={type} className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                              <p className="text-sm font-medium text-white mb-2 capitalize">
                                {type.replace('_', ' ')}
                              </p>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs" style={{ color: theme.colors.textSecondary }}>Email</span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={personalNotificationPrefs?.preferences?.[type]?.email ?? true}
                                      onChange={(e) => {
                                        const prefs = personalNotificationPrefs?.preferences || {};
                                        updatePersonalNotificationPrefsMutation.mutate({
                                          email_enabled: personalNotificationPrefs?.email_enabled ?? true,
                                          in_app_enabled: personalNotificationPrefs?.in_app_enabled ?? true,
                                          preferences: {
                                            ...prefs,
                                            [type]: {
                                              email: e.target.checked,
                                              in_app: prefs[type]?.in_app ?? true,
                                            },
                                          },
                                        });
                                      }}
                                      disabled={updatePersonalNotificationPrefsMutation.isPending}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-[#4f545c] peer-focus:outline-none peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--theme-primary)] peer-disabled:opacity-50" style={{ '--tw-ring-color': `${theme.colors.primary}33` } as any}></div>
                                  </label>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs" style={{ color: theme.colors.textSecondary }}>In-App</span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={personalNotificationPrefs?.preferences?.[type]?.in_app ?? true}
                                      onChange={(e) => {
                                        const prefs = personalNotificationPrefs?.preferences || {};
                                        updatePersonalNotificationPrefsMutation.mutate({
                                          email_enabled: personalNotificationPrefs?.email_enabled ?? true,
                                          in_app_enabled: personalNotificationPrefs?.in_app_enabled ?? true,
                                          preferences: {
                                            ...prefs,
                                            [type]: {
                                              email: prefs[type]?.email ?? true,
                                              in_app: e.target.checked,
                                            },
                                          },
                                        });
                                      }}
                                      disabled={updatePersonalNotificationPrefsMutation.isPending}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-[#4f545c] peer-focus:outline-none peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--theme-primary)] peer-disabled:opacity-50" style={{ '--tw-ring-color': `${theme.colors.primary}33` } as any}></div>
                                  </label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Account Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: theme.colors.textSecondary }}>Status</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.colors.success + '33', color: theme.colors.success }}>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: theme.colors.textSecondary }}>Email Verified</span>
                {profile?.email_verified ? (
                  <CheckCircle2 className="h-5 w-5" style={{ color: theme.colors.success }} />
                ) : (
                  <AlertCircle className="h-5 w-5" style={{ color: theme.colors.warning }} />
                )}
              </div>
              {profile?.created_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: theme.colors.textSecondary }}>Member Since</span>
                  <span className="text-sm text-white">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button
                onClick={handleViewActivityLog}
                variant="ghost"
                fullWidth
                className="text-left justify-start"
                leftIcon={<Activity className="h-4 w-4" />}
              >
                View Activity Log
              </Button>
              {isOrganizationOwner && (
                <Button
                  onClick={handleDownloadData}
                  disabled={isDownloading}
                  variant="ghost"
                  fullWidth
                  className="text-left justify-start"
                  isLoading={isDownloading}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Download Account Data
                </Button>
              )}
              <Button
                variant="danger"
                fullWidth
                className="text-left justify-start"
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Delete Account
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

