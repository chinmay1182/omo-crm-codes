// 'use client';

// import React, { useState, useEffect } from 'react';
// import toast from 'react-hot-toast';
// import Spinner from '@/app/components/Spinner/Spinner';
// import styles from '../styles.module.css';

// interface CallLog {
//   id: number;
//   reference_id: string;
//   cli: string;
//   a_party: string;
//   b_party: string;
//   status: string;
//   timestamp: string;
//   updated_at: string;
// }

// interface AgentPermissions {
//   canViewAllCalls: boolean;
//   canViewAssignedCalls: boolean;
//   canMakeCalls: boolean;
//   canTransferCalls: boolean;
//   canConferenceCalls: boolean;
// }

// interface HistoryPanelProps {
//   agentPermissions?: AgentPermissions;
//   agentData?: {
//     id: number;
//     username: string;
//     full_name?: string;
//   };
// }

// const HistoryPanel: React.FC<HistoryPanelProps> = ({ agentPermissions, agentData }) => {
//   const [history, setHistory] = useState<CallLog[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [filter, setFilter] = useState('all');

//   const fetchHistory = async () => {
//     setLoading(true);
//     setError('');
//     try {
//       // For agents, filter by their assigned calls if they don't have view_all_calls permission
//       const url = agentPermissions && !agentPermissions.canViewAllCalls
//         ? `/api/callLogs?agentId=${agentData?.id}`
//         : '/api/callLogs';

//       const res = await fetch(url);
//       if (!res.ok) throw new Error('Failed to fetch');
//       const data = await res.json();

//       // Handle paginated response structure { data: [], pagination: {} }
//       if (Array.isArray(data)) {
//         setHistory(data);
//       } else if (data && Array.isArray(data.data)) {
//         setHistory(data.data);
//       } else {
//         console.error('API returned non-array data:', data);
//         setHistory([]);
//         setError('Invalid data format received');
//       }
//     } catch (err) {
//       console.error('Error fetching call history:', err);
//       setError('Failed to load call history');
//       setHistory([]); // Ensure history is always an array
//     }
//     setLoading(false);
//   };

//   const exportToCSV = () => {
//     if (filteredHistory.length === 0) {
//       toast.error('No data to export');
//       return;
//     }

//     const csvContent = [
//       ['Reference ID', 'CLI', 'A Party', 'B Party', 'Status', 'Timestamp', 'Updated At'],
//       ...filteredHistory.map(call => [
//         call.reference_id,
//         call.cli,
//         call.a_party,
//         call.b_party,
//         call.status,
//         new Date(call.timestamp).toLocaleString(),
//         new Date(call.updated_at).toLocaleString()
//       ])
//     ].map(row => row.join(',')).join('\n');

//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement('a');
//     const url = URL.createObjectURL(blob);
//     link.setAttribute('href', url);
//     link.setAttribute('download', `call_history_${new Date().toISOString().split('T')[0]}.csv`);
//     link.style.visibility = 'hidden';
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);

//     toast.success('Call history exported successfully');
//   };

//   useEffect(() => {
//     fetchHistory();
//   }, []);

//   const getStatusIcon = (status: string) => {
//     switch (status.toLowerCase()) {
//       case 'connected': return 'fa-light fa-check-circle';
//       case 'initiated': return 'fa-light fa-phone';
//       case 'disconnected': return 'fa-light fa-phone-slash';
//       case 'failed': return 'fa-light fa-times-circle';
//       case 'on_hold': return 'fa-light fa-pause';
//       case 'resumed': return 'fa-light fa-play';
//       case 'conference_started': return 'fa-light fa-users';
//       case 'incoming_accepted': return 'fa-light fa-phone-volume';
//       case 'incoming_rejected': return 'fa-light fa-times-circle';
//       case 'ended_by_user': return 'fa-light fa-phone-slash';
//       default: return 'fa-light fa-phone';
//     }
//   };

//   const getStatusColor = (status: string) => {
//     switch (status.toLowerCase()) {
//       case 'connected': return '#4CAF50';
//       case 'initiated': return '#2196F3';
//       case 'disconnected': return '#FF9800';
//       case 'failed': return '#F44336';
//       case 'on_hold': return '#9C27B0';
//       case 'resumed': return '#4CAF50';
//       case 'conference_started': return '#00BCD4';
//       case 'incoming_accepted': return '#4CAF50';
//       case 'incoming_rejected': return '#F44336';
//       case 'ended_by_user': return '#607D8B';
//       default: return '#666';
//     }
//   };

//   const formatDuration = (start: string, end: string) => {
//     const startTime = new Date(start);
//     const endTime = new Date(end);
//     const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

//     if (duration < 60) return `${duration}s`;
//     const minutes = Math.floor(duration / 60);
//     const seconds = duration % 60;
//     return `${minutes}m ${seconds}s`;
//   };

//   const filteredHistory = Array.isArray(history) ? history.filter(call => {
//     if (filter === 'all') return true;
//     return call.status.toLowerCase() === filter;
//   }) : [];

//   return (
//     <div className={styles.panelContainer}>
//       <div className={styles.historyHeader}>
//         <h2 className={styles.cpaasHeading}>Call History</h2>
//         <div className={styles.historyControls}>
//           <select
//             value={filter}
//             onChange={(e) => setFilter(e.target.value)}
//             className={styles.filterSelect}
//           >
//             <option value="all">All Calls</option>
//             <option value="connected">Connected</option>
//             <option value="failed">Failed</option>
//             <option value="disconnected">Disconnected</option>
//             <option value="incoming_accepted">Incoming Accepted</option>
//             <option value="incoming_rejected">Incoming Rejected</option>
//           </select>
//           <button
//             onClick={fetchHistory}
//             className={styles.refreshButton}
//             disabled={loading}
//           >
//             <i className="fa-light fa-refresh" style={{ marginRight: '8px' }}></i>
//             Refresh
//           </button>
//           <button
//             onClick={exportToCSV}
//             className={styles.exportButton}
//             disabled={filteredHistory.length === 0}
//           >
//             <i className="fa-light fa-download" style={{ marginRight: '8px' }}></i>
//             Export CSV
//           </button>
//         </div>
//       </div>

//       {loading ? (
//         <div className={styles.loadingState}>
//           <Spinner size="medium" text="Loading call history..." />
//         </div>
//       ) : error ? (
//         <div className={styles.errorState}>
//           <i className="fa-light fa-times-circle" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#f44336' }}></i>
//           <p>{error}</p>
//           <button onClick={fetchHistory} className={styles.retryButton}>
//             Try Again
//           </button>
//         </div>
//       ) : filteredHistory.length === 0 ? (
//         <div className={styles.emptyState}>
//           <i className="fa-light fa-phone" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ccc' }}></i>
//           <p>No call history available</p>
//           {filter !== 'all' && (
//             <button onClick={() => setFilter('all')} className={styles.clearFilterButton}>
//               Show All Calls
//             </button>
//           )}
//         </div>
//       ) : (
//         <div className={styles.historyList}>
//           {filteredHistory.map((call) => (
//             <div key={call.id} className={styles.callLogItem}>
//               <div className={styles.callLogHeader}>
//                 <div className={styles.callDirection}>
//                   <span className={styles.statusIcon}>
//                     <i
//                       className={getStatusIcon(call.status)}
//                       style={{ color: getStatusColor(call.status) }}
//                     ></i>
//                   </span>
//                   <span className={styles.callNumbers}>
//                     {call.a_party} → {call.b_party}
//                   </span>
//                 </div>
//                 <div
//                   className={styles.callStatus}
//                   style={{ color: getStatusColor(call.status) }}
//                 >
//                   {call.status.replace(/_/g, ' ').toUpperCase()}
//                 </div>
//               </div>
//               <div className={styles.callLogDetails}>
//                 <div className={styles.callTime}>
//                   <i className="fa-light fa-calendar-day" style={{ marginRight: '8px' }}></i>
//                   {new Date(call.timestamp).toLocaleString()}
//                 </div>
//                 <div className={styles.callReference}>
//                   <i className="fa-light fa-link" style={{ marginRight: '8px' }}></i>
//                   {call.reference_id}
//                 </div>
//                 <div className={styles.callCli}>
//                   <i className="fa-light fa-mobile" style={{ marginRight: '8px' }}></i>
//                   CLI: {call.cli}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default HistoryPanel;
