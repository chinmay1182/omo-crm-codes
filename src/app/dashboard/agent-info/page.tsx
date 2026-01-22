'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Spinner from '@/app/components/Spinner/Spinner';
import styles from './styles.module.css';
import Image from 'next/image';

import { getPermissionDisplayName, getServiceDisplayName } from '@/app/lib/permissionUtils';
import { determineAgentType } from '@/app/lib/agentUtils';
import AccessDeniedTemplate from '@/app/components/ui/AccessDeniedTemplate';

export default function AgentInfo() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [agentType, setAgentType] = useState<string>('');
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);



  // Function to refresh permissions
  // Function to refresh permissions
  const refreshPermissions = async () => {
    if (!user || user.type !== 'agent') return;

    setRefreshing(true);
    try {
      const response = await fetch('/api/agent-auth/refresh-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agentId: user.id })
      });

      if (response.ok) {
        if (refreshUser) await refreshUser();
      } else {
        console.error('Failed to refresh permissions');
        alert('Failed to refresh permissions. Please try again.');
      }
    } catch (error) {
      console.error('Error refreshing permissions:', error);
      alert('Error refreshing permissions. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading && user && user.type === 'agent') {
      setPermissionsLoading(true);

      const refreshAndDetermineType = async () => {
        try {
          // Call refresh endpoint to update backend session
          const response = await fetch('/api/agent-auth/refresh-permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ agentId: user.id })
          });

          if (response.ok) {
            const data = await response.json();
            // Data return updated user/permissions
            // Use local determination or response data
            const type = determineAgentType(data.user.permissions);
            setAgentType(type);
          } else {
            const type = determineAgentType(user.permissions);
            setAgentType(type);
          }
        } catch (error) {
          console.error('Error refreshing permissions on load:', error);
          const type = determineAgentType(user.permissions);
          setAgentType(type);
        } finally {
          setPermissionsLoading(false);
        }
      };

      refreshAndDetermineType();
    }
  }, [loading, user?.id]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (!user || user.type !== 'agent') {
    return (
      <AccessDeniedTemplate message="This page is only accessible to agents." />
    );
  }

  if (permissionsLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${sidebarOpen ? styles.showSidebar : ''}`}>
      {/* Sidebar - User Info (30%) */}
      <div className={styles.sidebar}>
        <button
          className={styles.mobileCloseBtn}
          onClick={() => setSidebarOpen(false)}
        >
          <i className="fa-light fa-xmark"></i>
        </button>
        <div className={styles.profileHeader}>
          {user.profile_image ? (
            <div className={styles.avatarCircle} >
              <Image
                src={user.profile_image}
                alt="Profile"
                width={70}
                height={70}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                unoptimized
              />
            </div>
          ) : (
            <div className={styles.avatarCircle}>
              {user.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}

          <h2 className={styles.profileName}>
            {(user.full_name || user.username || '')}
          </h2>
          <span className={styles.profileEmail}>{user.email || 'No email provided'}</span>
        </div>

        <div className={styles.infoGroup}>
          <span className={styles.label}>Agent Type</span>
          <span className={styles.agentTypeBadge}>{agentType}</span>
        </div>

        <div className={styles.infoGroup}>
          <span className={styles.label}>Username</span>
          <span className={styles.value}>@{user.username}</span>
        </div>

        {user.phone_number && (
          <div className={styles.infoGroup}>
            <span className={styles.label}>Phone Number</span>
            <span className={styles.value}>{user.phone_number}</span>
          </div>
        )}

        <div className={styles.actionButtons}>
          <button
            onClick={refreshPermissions}
            disabled={refreshing}
            className={styles.refreshButton}
          >
            {refreshing ? 'Refreshing...' : <>Refresh Permissions</>}
          </button>

          {agentType === 'Administrator' && (
            <button
              onClick={() => router.push('/dashboard/admin/agent-permissions')}
              className={styles.manageButton}
            >
              Manage All Agents
            </button>
          )}
        </div>
      </div>

      {/* Main Content - Permissions (70%) */}
      <div className={styles.mainContent}>
        <div className={styles.contentHeaderMobile}>
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setSidebarOpen(true)}
          >
            <i className="fa-light fa-bars"></i>
          </button>
          <h3 className={styles.sectionTitle}>
            Assigned Permissions
          </h3>
        </div>

        {user.permissions && Object.keys(user.permissions).length > 0 ? (
          <div className={styles.permissionsGrid}>
            {Object.entries(user.permissions)
              .filter(([service]) => !['whatsapp', 'voip', 'Whatsapp', 'Voip'].includes(service))
              .map(([service, perms]) => (
                <div key={service} className={styles.serviceCard}>
                  <div className={styles.serviceHeader}>
                    <h4 className={styles.serviceName}>{getServiceDisplayName(service)}</h4>
                  </div>
                  <div className={styles.permissionList}>
                    {Array.isArray(perms) && perms.map((permission, index) => (
                      <span key={index} className={styles.permissionTag}>
                        {getPermissionDisplayName(permission)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className={styles.noPermissions}>
            <i className="fa-sharp fa-thin fa-lock" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}></i>
            <p>No specific permissions assigned to your account.</p>
          </div>
        )}
      </div>

    </div>
  );
}
