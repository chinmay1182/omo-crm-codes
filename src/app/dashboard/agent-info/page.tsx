'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useState, useEffect } from 'react';
import Spinner from '@/app/components/Spinner/Spinner';
import styles from './styles.module.css';
import Image from 'next/image';

import { getPermissionDisplayName, getServiceDisplayName } from '@/app/lib/permissionUtils';
import AccessDeniedTemplate from '@/app/components/ui/AccessDeniedTemplate';

export default function AgentInfo() {
  const { user, loading } = useAuth();
  const [agentType, setAgentType] = useState<string>('');
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Determine agent type based on permissions
  const determineAgentType = (permissions: any) => {
    if (!permissions || typeof permissions !== 'object') {
      return 'REGULAR AGENT';
    }

    const whatsapp = permissions.whatsapp || [];
    const voip = permissions.voip || [];
    const admin = permissions.admin || [];


    // Check for Administrator (has admin permissions)
    if (admin.length > 0 || admin.includes('manage_agents')) {
      return 'Administrator';
    }

    // Check for Super Agent (has comprehensive WhatsApp permissions but NO admin permissions)
    if (whatsapp.includes('view_all') && whatsapp.includes('reply_all')) {
      return 'Super Agent';
    }

    // Check for Senior Agent (has transfer capabilities and broader access)
    if (voip.includes('view_all_calls') && voip.includes('transfer_calls')) {
      return 'Senior Agent';
    }

    // Check for Regular Agent (basic permissions)
    if ((whatsapp.includes('view_assigned') && whatsapp.includes('reply_assigned')) ||
      voip.includes('make_calls')) {
      return 'Regular Agent';
    }

    // Check for View Only Agent
    if (whatsapp.includes('view_assigned') && !whatsapp.includes('reply_assigned')) {
      return 'View only Agent';
    }

    return 'Regular Agent';
  };

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
        const data = await response.json();
        // Update the user data in the context
        window.location.reload(); // Simple refresh to update the context
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
    if (user && user.type === 'agent') {
      setPermissionsLoading(true);

      // Automatically refresh permissions when page loads
      const refreshAndDetermineType = async () => {
        try {
          const response = await fetch('/api/agent-auth/refresh-permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ agentId: user.id })
          });

          if (response.ok) {
            const data = await response.json();
            // Use the refreshed permissions
            const type = determineAgentType(data.user.permissions);
            setAgentType(type);
          } else {
            // Fallback to current permissions if refresh fails
            const type = determineAgentType(user.permissions);
            setAgentType(type);
          }
        } catch (error) {
          console.error('Error refreshing permissions on load:', error);
          // Fallback to current permissions
          const type = determineAgentType(user.permissions);
          setAgentType(type);
        } finally {
          setPermissionsLoading(false);
        }
      };

      const timer = setTimeout(refreshAndDetermineType, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" text="Loading agent information..." />
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
        <Spinner size="large" text="Refreshing permissions..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sidebar - User Info (30%) */}
      <div className={styles.sidebar}>
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
            {(user.full_name || user.username || '').toLowerCase()}
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
              onClick={() => window.location.href = '/dashboard/admin/agent-permissions'}
              className={styles.manageButton}
            >
              Manage All Agents
            </button>
          )}
        </div>
      </div>

      {/* Main Content - Permissions (70%) */}
      <div className={styles.mainContent}>
        <h3 className={styles.sectionTitle}>
          Assigned Permissions
        </h3>

        {user.permissions && Object.keys(user.permissions).length > 0 ? (
          <div className={styles.permissionsGrid}>
            {Object.entries(user.permissions).map(([service, perms]) => (
              <div key={service} className={styles.serviceCard}>
                <div className={styles.serviceHeader}>
                  <h4 className={styles.serviceName}>{getServiceDisplayName(service).toLowerCase()}</h4>
                </div>
                <div className={styles.permissionList}>
                  {Array.isArray(perms) && perms.map((permission, index) => (
                    <span key={index} className={styles.permissionTag}>
                      {getPermissionDisplayName(permission).toLowerCase()}
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
