// 'use client';

// import React, { useState, useEffect } from 'react';
// import toast from 'react-hot-toast';
// import Tabs from './Tabs';
// import styles from '../styles.module.css';
// import { getPermissionDisplayName } from '@/app/lib/permissionUtils';
// import { PERMISSIONS, hasPermission } from '@/app/lib/constants/permissions';

// interface AgentPermissions {
//   whatsapp: string[];
//   voip: string[];
//   admin: string[];
// }

// interface AgentVoIPProps {
//   agentData: {
//     id: number;
//     username: string;
//     full_name?: string;
//     permissions: AgentPermissions;
//   };
//   token: string;
//   cliNumber: string;
// }

// export default function AgentVoIP({ agentData, token, cliNumber }: AgentVoIPProps) {
//   const permissions = agentData.permissions?.voip || [];
//   const [refreshing, setRefreshing] = useState(false);

//   // CLI Selection State
//   const [availableClis, setAvailableClis] = useState<any[]>([]);
//   const [selectedCli, setSelectedCli] = useState(cliNumber); // Default to prop

//   // Fetch available CLIs on mount
//   useEffect(() => {
//     const fetchClis = async () => {
//       try {
//         // Check if user is admin
//         const isAdmin = agentData.username === 'admin@example.com' || (agentData.permissions?.admin && agentData.permissions.admin.length > 0);

//         // Admins see all CLIs, Agents see only assigned ones
//         const endpoint = isAdmin
//           ? '/api/cli-numbers'
//           : '/api/cli-numbers?assigned_only=true';

//         const res = await fetch(endpoint);
//         if (res.ok) {
//           const data = await res.json();
//           // Logs removed for performance
//           setAvailableClis(data);

//           // Auto-select logic for agents
//           if (!isAdmin && data.length > 0) {
//             // If current selectedCli is not in the list, select the first assigned CLI
//             const isCurrentCliValid = data.find((c: any) => c.number === selectedCli);
//             if (!isCurrentCliValid) {
//               // Logs removed for performance
//               setSelectedCli(data[0].number);
//             }
//           }
//         }
//       } catch (error) {
//         console.error('Failed to fetch CLIs:', error);
//       }
//     };
//     fetchClis();
//   }, [agentData]);

//   // VoIP Permission checks
//   const canViewAllCalls = hasPermission(permissions, PERMISSIONS.VOIP.VIEW_ALL, PERMISSIONS.VOIP.LEGACY.VIEW_ALL);
//   const canViewAssignedCalls = hasPermission(permissions, PERMISSIONS.VOIP.VIEW_ASSIGNED, PERMISSIONS.VOIP.LEGACY.VIEW_ASSIGNED);
//   const canMakeCalls = hasPermission(permissions, PERMISSIONS.VOIP.MAKE_CALLS, PERMISSIONS.VOIP.LEGACY.CALL);
//   const canTransferCalls = hasPermission(permissions, PERMISSIONS.VOIP.TRANSFER_CALLS, PERMISSIONS.VOIP.LEGACY.TRANSFER);
//   const canConferenceCalls = hasPermission(permissions, PERMISSIONS.VOIP.CONFERENCE_CALLS, PERMISSIONS.VOIP.LEGACY.CONFERENCE);


//   // Check if agent has any VoIP permissions
//   const hasVoipAccess = canViewAllCalls || canViewAssignedCalls || canMakeCalls || canTransferCalls || canConferenceCalls;

//   // Function to refresh permissions
//   const refreshPermissions = async (e: React.MouseEvent) => {
//     e.preventDefault();
//     e.stopPropagation();

//     if (refreshing) return; // Prevent multiple clicks

//     // Logs removed for performance
//     setRefreshing(true);

//     try {
//       const response = await fetch('/api/agent-auth/refresh-permissions', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         credentials: 'include',
//         body: JSON.stringify({ agentId: agentData.id })
//       });

//       if (response.ok) {
//         // Logs removed for performance
//         // Reload the page to get updated permissions
//         window.location.reload();
//       } else {
//         console.error('Failed to refresh permissions');
//         toast.error('Failed to refresh permissions');
//       }
//     } catch (error) {
//       console.error('Error refreshing permissions:', error);
//       toast.error('Error refreshing permissions');
//     } finally {
//       setRefreshing(false);
//     }
//   };

//   if (!hasVoipAccess) {
//     return (
//       <div className={styles.panelContainer}>
//         <div className={styles.noPermission}>
//           <h2>Access Denied</h2>
//           <p>You do not have permission to access VoIP services.</p>
//           <p>Contact your administrator to request access.</p>
//           <div className={styles.debugInfo}>
//             <h4>Debug Information:</h4>
//             <p><strong>Agent ID:</strong> {agentData.id}</p>
//             <p><strong>Username:</strong> {agentData.username}</p>
//             <p><strong>All Permissions:</strong> {JSON.stringify(agentData.permissions, null, 2)}</p>
//             <p><strong>VoIP Permissions:</strong> {JSON.stringify(permissions, null, 2)}</p>
//             <p><strong>Available VoIP Permissions:</strong> view_all_calls, view_assigned_calls_only, make_calls, transfer_calls, conference_calls</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.panelContainer}>
//       {/* Agent Info Header */}
//       <div className={styles.agentHeader}>
//         <div className={styles.agentInfo}>
//           <h3>Welcome, {agentData.full_name || agentData.username}</h3>

//           {/* CLI Selector */}
//           <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
//             <span className={styles.permissionsLabel}>Active Line:</span>
//             <select
//               value={selectedCli}
//               onChange={(e) => setSelectedCli(e.target.value)}
//               style={{
//                 padding: '5px 10px',
//                 borderRadius: '4px',
//                 border: '1px solid #ddd',
//                 backgroundColor: 'white',
//                 cursor: 'pointer'
//               }}
//             >
//               {availableClis.map(cli => (
//                 <option key={cli.id} value={cli.number}>
//                   {cli.display_name} ({cli.number})
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className={styles.permissions}>
//             <span className={styles.permissionsLabel}>VoIP Permissions:</span>
//             <div className={styles.permissionTags}>
//               {permissions.map(perm => (
//                 <span key={perm} className={styles.permissionTag}>
//                   {getPermissionDisplayName(perm)}
//                 </span>
//               ))}
//             </div>
//           </div>
//         </div>
//         {/* Temporarily disabled refresh button to debug */}
//         {/* <button 
//           type="button"
//           onClick={refreshPermissions}
//           disabled={refreshing}
//           className={styles.refreshButton}
//           style={{ pointerEvents: refreshing ? 'none' : 'auto' }}
//         >
//           {refreshing ? 'Refreshing...' : 'Refresh Permissions'}
//         </button> */}
//       </div>

//       {/* Use the same Tabs component as admin but with agent permissions */}
//       <Tabs
//         token={token}
//         selectedCliNumber={selectedCli}
//         agentPermissions={{
//           canViewAllCalls,
//           canViewAssignedCalls,
//           canMakeCalls,
//           canTransferCalls,
//           canConferenceCalls
//         }}
//         agentData={agentData}
//       />
//     </div>
//   );
// }