import React from 'react';
import { useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { UnauthorizedAccess } from './UnauthorizedAccess';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string | null;
  featureName?: string;
  restrictedForBranches?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  featureName,
  restrictedForBranches = false,
}) => {
  const { hasPermission, isOwner, isLoadingPermissions } = usePermissions();
  const location = useLocation();
  const { _hasHydrated, organization } = useAuthStore();

  // Wait for hydration and permission loading
  if (!_hasHydrated || isLoadingPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#36393f', color: '#ffffff' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Check if restricted for branches
  const isBranch = organization?.org_type === 'BRANCH' || !!organization?.parent_id;
  if (restrictedForBranches && isBranch) {
    return (
      <UnauthorizedAccess
        feature={featureName || location.pathname}
        message="A branch cannot view this. This feature is only available to the Main Organization."
      />
    );
  }

  // If no permission required, allow access
  if (!requiredPermission) {
    return <>{children}</>;
  }

  // Owner has all permissions
  if (isOwner) {
    return <>{children}</>;
  }

  // Check if user has permission
  if (!hasPermission(requiredPermission)) {
    return (
      <UnauthorizedAccess
        feature={featureName || location.pathname}
        message={`You do not have permission to access this page. Please ask your organization owner to set up the "${requiredPermission}" permission for your role.`}
      />
    );
  }

  return <>{children}</>;
};

