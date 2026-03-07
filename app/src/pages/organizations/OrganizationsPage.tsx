import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import toast from '@shared/hooks/useToast';
import { Building2, Settings, Edit, Save, X, MapPin, Phone, Globe, FileText, CheckCircle2, AlertCircle, Upload, File } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { formatLimit } from '../../utils/formatLimit';
import DocumentUpload from '../../components/DocumentUpload';
import DocumentGallery from '../../components/DocumentGallery';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Input, Card, CardContent, CardHeader, Badge, Loading } from '@shared';
import BranchesSection from '../../components/organizations/BranchesSection';
import OrgHierarchyTree from '../../components/organizations/OrgHierarchyTree';
import { Shield, Sparkles, Loader2 } from 'lucide-react';

const organizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  tax_id: z.string().max(100).optional(),
  registration_number: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, accessToken, _hasHydrated } = useAuthStore();
  const { isOrganizationOwner, hasPermission } = usePermissions();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'details' | 'branches'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  // Check if user can edit organization
  const canEditOrganization = isOrganizationOwner || hasPermission('organizations.edit');

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await api.get('/organizations/me');
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  // Fetch branches for hierarchy tree (only when main org)
  const { data: branchesData } = useQuery({
    queryKey: ['organization-branches'],
    queryFn: async () => {
      const response = await api.get('/organizations/me/branches');
      return response.data;
    },
    enabled: !!organization && organization.org_type === 'MAIN',
  });

  // Contextual permissions
  const isMainOrg = organization?.org_type === 'MAIN';
  const isBranch = organization?.org_type === 'BRANCH' || !!organization?.parent_id;

  // Can edit the "Organization Details" tab
  // - If Main Org: User must have permission in Main Org
  // - If Branch: Nobody can edit (it shows parent info)
  const canEditMainDetails = isMainOrg && canEditOrganization;

  // Can edit the "Branch Details" tab (when viewing a branch)
  const canEditBranchDetails = isBranch && canEditOrganization;

  const switchOrganizationMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await api.put('/organizations/switch', { organization_id: organizationId });
      return response.data;
    },
    onSuccess: (data) => {
      const authStore = useAuthStore.getState();
      authStore.setAuth(
        { access_token: data.access_token, refresh_token: data.refresh_token },
        data.user,
        data.organization,
        null
      );
      queryClient.invalidateQueries();
      toast.success(`Switched to ${data.organization.name}`);
      window.location.reload(); // Refresh to ensure all data is consistent
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to switch organization');
    },
  });

  const { data: packageInfo, refetch: refetchPackage } = useQuery({
    queryKey: ['current-package'],
    queryFn: async () => {
      const response = await api.get('/organizations/me/package');
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
    refetchOnWindowFocus: true,
  });

  // Listen for package update events
  useEffect(() => {
    const handlePackageUpdate = () => {
      console.log('[Organizations] Package update event received, refetching package data...');
      refetchPackage();
    };

    window.addEventListener('package-updated', handlePackageUpdate);
    return () => {
      window.removeEventListener('package-updated', handlePackageUpdate);
    };
  }, [refetchPackage]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: organization,
  });

  // Update form when organization data loads
  useEffect(() => {
    if (organization) {
      reset({
        name: organization.name || '',
        email: organization.email || '',
        phone: organization.phone || '',
        address: organization.address || '',
        city: organization.city || '',
        state: organization.state || '',
        country: organization.country || '',
        postal_code: organization.postal_code || '',
        website: organization.website || '',
        description: organization.description || '',
        tax_id: organization.tax_id || '',
        registration_number: organization.registration_number || '',
        industry: organization.industry || '',
      });
    }
  }, [organization, reset]);

  // Fetch documents
  const { data: documents } = useQuery({
    queryKey: ['organization-documents'],
    queryFn: async () => {
      const response = await api.get('/organizations/me/documents');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const response = await api.put('/organizations/me', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Organization updated successfully');
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update organization');
    },
  });

  const onSubmit = (data: OrganizationFormData) => {
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    reset(organization);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="card animate-pulse" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
        <div className="h-64 rounded" style={{ backgroundColor: theme.colors.background }}></div>
      </div>
    );
  }

  const renderDetailsForm = (data: any, isReadonly: boolean, isBranch: boolean = false) => (
    <dl className="space-y-4">
      <div>
        <dt className="text-sm font-medium flex items-center" style={{ color: theme.colors.textSecondary }}>
          <Building2 className="h-4 w-4 mr-2" />
          {isBranch ? 'Branch Name' : 'Name'}
        </dt>
        <dd className="mt-1 text-sm font-semibold" style={{ color: theme.colors.text }}>{data?.name}</dd>
      </div>
      <div>
        <dt className="text-sm font-medium flex items-center" style={{ color: theme.colors.textSecondary }}>
          <Settings className="h-4 w-4 mr-2" />
          {isBranch ? 'Branch Email' : 'Email'}
        </dt>
        <dd className="mt-1 text-sm" style={{ color: theme.colors.text }}>{data?.email}</dd>
      </div>
      {data?.phone && (
        <div>
          <dt className="text-sm font-medium flex items-center" style={{ color: theme.colors.textSecondary }}>
            <Phone className="h-4 w-4 mr-2" />
            Phone
          </dt>
          <dd className="mt-1 text-sm" style={{ color: theme.colors.text }}>{data.phone}</dd>
        </div>
      )}
      {(data?.address || data?.city || data?.state || data?.country) && (
        <div>
          <dt className="text-sm font-medium flex items-center" style={{ color: theme.colors.textSecondary }}>
            <MapPin className="h-4 w-4 mr-2" />
            Address
          </dt>
          <dd className="mt-1 text-sm" style={{ color: theme.colors.text }}>
            {[
              data.address,
              data.city,
              data.state,
              data.postal_code,
              data.country,
            ]
              .filter(Boolean)
              .join(', ')}
          </dd>
        </div>
      )}
      {data?.website && (
        <div>
          <dt className="text-sm font-medium flex items-center" style={{ color: theme.colors.textSecondary }}>
            <Globe className="h-4 w-4 mr-2" />
            Website
          </dt>
          <dd className="mt-1">
            <a
              href={data.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm transition-colors"
              style={{ color: theme.colors.primary }}
            >
              {data.website}
            </a>
          </dd>
        </div>
      )}
      {data?.description && (
        <div>
          <dt className="text-sm font-medium flex items-center" style={{ color: theme.colors.textSecondary }}>
            <FileText className="h-4 w-4 mr-2" />
            Description
          </dt>
          <dd className="mt-1 text-sm" style={{ color: theme.colors.text }}>{data.description}</dd>
        </div>
      )}
      {data?.tax_id && (
        <div>
          <dt className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Tax ID</dt>
          <dd className="mt-1 text-sm" style={{ color: theme.colors.text }}>{data.tax_id}</dd>
        </div>
      )}
      {data?.registration_number && (
        <div>
          <dt className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Registration Number</dt>
          <dd className="mt-1 text-sm" style={{ color: theme.colors.text }}>{data.registration_number}</dd>
        </div>
      )}
      {data?.industry && (
        <div>
          <dt className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Industry</dt>
          <dd className="mt-1 text-sm" style={{ color: theme.colors.text }}>{data.industry}</dd>
        </div>
      )}
      <div>
        <dt className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Status</dt>
        <dd className="mt-1">
          <Badge variant="success" size="sm">
            {data?.status || 'Active'}
          </Badge>
        </dd>
      </div>
    </dl>
  );

  return (
    <div className="w-full p-6 animate-fadeIn" style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shadow-lg" style={{ backgroundColor: theme.colors.primary, background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}>
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: theme.colors.text }}>
                {organization?.org_type === 'BRANCH' ? (organization?.parent?.name || organization?.name) : organization?.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={organization?.org_type === 'MAIN' ? 'primary' : 'secondary'} size="sm" className="font-bold">
                  {organization?.org_type === 'MAIN' ? 'MASTER ORGANIZATION' : 'BRANCH OFFICE'}
                </Badge>
                {organization?.org_type === 'BRANCH' && (
                  <span className="text-sm font-bold flex items-center gap-2" style={{ color: theme.colors.primary }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
                    {organization.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              ((activeTab === 'details' && canEditMainDetails) || (activeTab === 'branches' && canEditBranchDetails)) && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="primary"
                  leftIcon={<Edit className="h-4 w-4" />}
                  className="shadow-md"
                >
                  Edit Details
                </Button>
              )
            )}
            {isBranch && organization.parent && (
              <Button
                variant="outline"
                onClick={() => switchOrganizationMutation.mutate(organization.parent.id)}
                disabled={switchOrganizationMutation.isPending}
                leftIcon={switchOrganizationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              >
                Switch to Master
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-8 p-1 rounded-xl w-fit" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
          <button
            onClick={() => { setActiveTab('details'); setIsEditing(false); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'details' ? 'shadow-sm' : 'hover:bg-opacity-50'}`}
            style={{
              backgroundColor: activeTab === 'details' ? theme.colors.background : 'transparent',
              color: activeTab === 'details' ? theme.colors.primary : theme.colors.textSecondary,
            }}
          >
            General Information
          </button>
          {isMainOrg && (
            <button
              onClick={() => { setActiveTab('branches'); setIsEditing(false); }}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'branches' ? 'shadow-sm' : 'hover:bg-opacity-50'}`}
              style={{
                backgroundColor: activeTab === 'branches' ? theme.colors.background : 'transparent',
                color: activeTab === 'branches' ? theme.colors.primary : theme.colors.textSecondary,
              }}
            >
              Branch Network
            </button>
          )}
        </div>
      </div>

      {/* Layout Grid - Responsive columns based on sidebar presence */}
      {(() => {
        const hasSidebarContent = activeTab === 'details' || (activeTab === 'branches' && isBranch && organization.parent);
        return (
          <div className={`grid grid-cols-1 ${hasSidebarContent ? 'lg:grid-cols-3' : ''} gap-6`}>
            {/* Main Content Area */}
            <div className={`${hasSidebarContent ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
              {activeTab === 'details' ? (
                <>
                  <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <CardHeader className="flex flex-row items-center justify-between border-b" style={{ borderColor: theme.colors.border }}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" style={{ color: theme.colors.primary }} />
                        <h2 className="text-lg font-bold">
                          {isMainOrg ? 'Master Organization Information' : 'Organization & Branch Information'}
                        </h2>
                      </div>
                      {isEditing && (
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
                          <Button variant="primary" size="sm" onClick={handleSubmit(onSubmit)} isLoading={updateMutation.isPending}>Save</Button>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="mt-4">
                      {isBranch && (
                        <div className="mb-8 p-4 rounded-xl border-2 border-dashed" style={{ borderColor: `${theme.colors.primary}20`, backgroundColor: `${theme.colors.background}80` }}>
                          <h3 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: theme.colors.primary }}>Parent Enterprise (ReadOnly)</h3>
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <dt className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: theme.colors.textSecondary }}>Enterprise Name</dt>
                              <dd className="text-sm font-black" style={{ color: theme.colors.text }}>{organization.parent?.name}</dd>
                            </div>
                            <div>
                              <dt className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: theme.colors.textSecondary }}>Corporate Email</dt>
                              <dd className="text-sm font-semibold" style={{ color: theme.colors.textSecondary }}>{organization.parent?.email}</dd>
                            </div>
                          </dl>
                        </div>
                      )}

                      {isEditing ? (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                          {isBranch && (
                            <div className="p-3 rounded-lg mb-2" style={{ backgroundColor: `${theme.colors.primary}08` }}>
                              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.colors.primary }}>Branch Specific Data</p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label={isBranch ? "Branch Name *" : "Name *"} {...register('name')} error={errors.name?.message} fullWidth />
                            <Input label={isBranch ? "Branch Email *" : "Email *"} {...register('email')} error={errors.email?.message} fullWidth />
                            <Input label="Phone" {...register('phone')} error={errors.phone?.message} fullWidth />
                            <Input label="Website" {...register('website')} error={errors.website?.message} fullWidth />
                          </div>
                          <Input label="Address" {...register('address')} fullWidth />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="City" {...register('city')} fullWidth />
                            <Input label="State" {...register('state')} fullWidth />
                            <Input label="Zip" {...register('postal_code')} fullWidth />
                          </div>
                        </form>
                      ) : (
                        renderDetailsForm(organization, false, isBranch)
                      )}
                    </CardContent>
                  </Card>

                  {/* Documents Section (Moved inside details tab) */}
                  <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <File className="h-5 w-5" style={{ color: theme.colors.primary }} />
                        <h2 className="text-lg font-bold">Documents & Identity</h2>
                      </div>
                      {canEditOrganization && (
                        <Button variant="primary" size="sm" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setShowDocumentModal(true)}>
                          Upload
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <DocumentGallery
                        documents={documents || []}
                        onUploadClick={canEditOrganization ? () => setShowDocumentModal(true) : undefined}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                isMainOrg ? (
                  <>
                    <OrgHierarchyTree
                      mainOrg={organization}
                      branches={branchesData || []}
                    />
                    <BranchesSection
                      organization={organization}
                      onSwitchOrganization={(id) => switchOrganizationMutation.mutate(id)}
                      isSwitching={switchOrganizationMutation.isPending}
                    />
                  </>
                ) : (
                  <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <CardHeader className="flex flex-row items-center justify-between border-b" style={{ borderColor: theme.colors.border }}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" style={{ color: theme.colors.primary }} />
                        <h2 className="text-lg font-bold">Branch Office Details</h2>
                      </div>
                      {isEditing && activeTab === 'branches' && (
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
                          <Button variant="primary" size="sm" onClick={handleSubmit(onSubmit)} isLoading={updateMutation.isPending}>Save</Button>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="mt-4">
                      {isEditing && activeTab === 'branches' ? (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Branch Name *" {...register('name')} error={errors.name?.message} fullWidth />
                            <Input label="Branch Email *" {...register('email')} error={errors.email?.message} fullWidth />
                            <Input label="Phone" {...register('phone')} error={errors.phone?.message} fullWidth />
                            <Input label="Website" {...register('website')} error={errors.website?.message} fullWidth />
                          </div>
                          <Input label="Address" {...register('address')} fullWidth />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="City" {...register('city')} fullWidth />
                            <Input label="State" {...register('state')} fullWidth />
                            <Input label="Zip" {...register('postal_code')} fullWidth />
                          </div>
                        </form>
                      ) : (
                        renderDetailsForm(organization, false, isBranch)
                      )}
                    </CardContent>
                  </Card>
                )
              )}

            </div>

            {/* Sidebar Columns */}
            {hasSidebarContent && (
              <div className="space-y-6">
                {/* Subscription & Security (Only on Details Tab) */}
                {activeTab === 'details' && !isBranch && (
                  <>
                    <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                      <CardHeader className="border-b" style={{ borderColor: theme.colors.border }}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-amber-500" />
                          <h3 className="font-bold">Subscription Status</h3>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: `${theme.colors.primary}10`, border: `1px dashed ${theme.colors.primary}40` }}>
                          <p className="text-xs uppercase font-black tracking-widest mb-1" style={{ color: theme.colors.primary }}>Active Plan</p>
                          <h4 className="text-xl font-black" style={{ color: theme.colors.text }}>{packageInfo?.package?.name || 'Standard'}</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span style={{ color: theme.colors.textSecondary }}>Users</span>
                            <span className="font-bold">{formatLimit(packageInfo?.current_limits?.users)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: theme.colors.textSecondary }}>Roles</span>
                            <span className="font-bold">{formatLimit(packageInfo?.current_limits?.roles)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: theme.colors.textSecondary }}>Branches</span>
                            <span className="font-bold">{formatLimit(organization?.branch_limit)}</span>
                          </div>
                        </div>
                        <Button variant="outline" fullWidth className="mt-6" onClick={() => window.location.href = '/packages'}>
                          Upgrade Subscription
                        </Button>
                      </CardContent>
                    </Card>

                    <Card style={{ backgroundColor: theme.colors.background, borderColor: '#f44336' }}>
                      <CardContent className="pt-6">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" style={{ color: '#f44336' }} />
                          <div>
                            <h3 className="text-sm font-bold" style={{ color: '#f44336' }}>Security Note</h3>
                            <p className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                              Keep your organization details up to date. This information is used for billing, tax invoices, and verification purposes.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Master Entity Info (Only on Branches Tab) */}
                {activeTab === 'branches' && isBranch && organization.parent && (
                  <Card className="overflow-hidden border-2" style={{ borderColor: `${theme.colors.primary}40`, backgroundColor: `${theme.colors.surface}` }}>
                    <CardHeader className="border-b" style={{ borderColor: theme.colors.border }}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" style={{ color: theme.colors.primary }} />
                        <h3 className="font-bold">Master Entity</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-2 mb-6">
                        <p className="text-lg font-black" style={{ color: theme.colors.text }}>{organization.parent.name}</p>
                        <p className="text-xs font-medium opacity-70" style={{ color: theme.colors.textSecondary }}>{organization.parent.email}</p>
                      </div>
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => switchOrganizationMutation.mutate(organization.parent.id)}
                        disabled={switchOrganizationMutation.isPending}
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        {switchOrganizationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Switch to Master Context'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <DocumentUpload
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['organization-documents'] });
          setShowDocumentModal(false);
        }}
      />
    </div>
  );
}
