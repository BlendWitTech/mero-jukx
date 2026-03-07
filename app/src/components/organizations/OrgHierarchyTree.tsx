import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface OrgNode {
  id: string;
  name: string;
  slug: string;
  org_type: 'MAIN' | 'BRANCH' | 'CREATOR';
  status: string;
  city?: string | null;
  country?: string | null;
}

interface OrgHierarchyTreeProps {
  mainOrg: OrgNode;
  branches: OrgNode[];
}

export default function OrgHierarchyTree({ mainOrg, branches }: OrgHierarchyTreeProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const orgTypeBadgeColor = (type: string) => {
    if (type === 'MAIN') return { bg: `${theme.colors.primary}22`, color: theme.colors.primary, border: `${theme.colors.primary}44` };
    return { bg: '#d97706' + '22', color: '#d97706', border: '#d97706' + '44' };
  };

  const renderNode = (org: OrgNode, isMain: boolean) => {
    const badge = orgTypeBadgeColor(org.org_type);
    const isActive = org.status === 'active';

    return (
      <div
        key={org.id}
        onClick={() => navigate(`/org/${org.slug}`)}
        className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
        style={{
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          marginBottom: 8,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = theme.colors.primary;
          e.currentTarget.style.boxShadow = `0 4px 12px -2px ${theme.colors.primary}33`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Status dot */}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: isActive ? '#22c55e' : '#ef4444' }}
          title={isActive ? 'Active' : 'Inactive'}
        />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: theme.colors.text }}>
            {org.name}
          </div>
          {(org.city || org.country) && (
            <div className="text-xs truncate" style={{ color: theme.colors.textSecondary }}>
              {[org.city, org.country].filter(Boolean).join(', ')}
            </div>
          )}
        </div>

        {/* Org type badge */}
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
        >
          {org.org_type}
        </span>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
        Organization Hierarchy
      </h3>

      {/* Main org */}
      {renderNode(mainOrg, true)}

      {/* Branch nodes with indented tree line */}
      {branches.length > 0 && (
        <div
          className="pl-6"
          style={{ borderLeft: `2px solid ${theme.colors.border}`, marginLeft: 12 }}
        >
          {branches.map((branch) => renderNode(branch, false))}
        </div>
      )}

      {branches.length === 0 && (
        <div className="pl-6 text-sm" style={{ color: theme.colors.textSecondary, marginLeft: 12 }}>
          No branches yet.
        </div>
      )}
    </div>
  );
}
