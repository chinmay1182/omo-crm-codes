// "use client";
// import React, { useEffect, useState } from "react";

// interface Call {
//   CALL_ID?: string;
//   call_id?: string;
//   A_PARTY_NO?: string;
//   aparty?: string;
//   from?: string;
//   callerNumber?: string;
//   B_PARTY_NO?: string;
//   bparty?: string;
//   to?: string;
//   timestamp?: string;
//   missed_at?: string;
//   status?: string;
//   missed_reason?: string;
//   call_source?: string;
// }

// interface CallsPanelProps {
//   token: string;
//   cliNumber: string;
// }

// const CallsPanel: React.FC<CallsPanelProps> = ({ token, cliNumber }) => {
//   const [incomingCalls, setIncomingCalls] = useState<Call[]>([]);
//   const [missedCalls, setMissedCalls] = useState<Call[]>([]);
//   const [isLoading, setIsLoading] = useState(false);

//   // Auto-fetch missed calls from provider
//   const fetchMissedCalls = async () => {
//     if (!token || !cliNumber) return;

//     setIsLoading(true);
//     try {
//       const response = await fetch(`/api/missed-calls?cli=${cliNumber}&token=${token}`);

//       if (response.ok) {
//         const data = await response.json();

//         if (data.success && data.missedCalls) {
//           const normalizedCalls = data.missedCalls.map((call: any) => ({
//             ...call,
//             status: call.status || 'missed',
//             missed_at: call.call_time || call.CALL_START_TIME || call.timestamp,
//             missed_reason: call.missed_reason || 'provider_fetch',
//             call_source: call.call_source || 'Provider API'
//           }));

//           setMissedCalls(normalizedCalls);
//         }
//       }
//     } catch (error) {
//       console.error('❌ Error fetching missed calls:', error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Auto-fetch missed calls on mount and every 5 seconds
//   useEffect(() => {
//     if (token && cliNumber) {
//       fetchMissedCalls(); // Initial fetch

//       const interval = setInterval(fetchMissedCalls, 5000); // Every 5 seconds
//       return () => clearInterval(interval);
//     }
//   }, [token, cliNumber]);

//   useEffect(() => {
//     const eventSource = new EventSource("/api/pingback/stream");

//     eventSource.onopen = () => {
//     };

//     eventSource.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);

//         if (data.type === "incoming_call") {
//           setIncomingCalls((prev) => [...prev, data.data]);
//         }

//         if (data.type === "missed_call") {
//           setMissedCalls((prev) => [...prev, {
//             ...data.data,
//             status: 'missed',
//             missed_at: new Date().toISOString(),
//             missed_reason: 'external_disconnect'
//           }]);
//         }

//         if (data.type === "ivr_missed_call") {
//           setMissedCalls((prev) => [...prev, {
//             ...data.data,
//             status: 'ivr_missed',
//             missed_at: new Date().toISOString(),
//             missed_reason: 'ivr_timeout_or_hangup',
//             call_source: 'IVR (No Selection Made)'
//           }]);
//         }
//       } catch (error) {
//         console.error('❌ CallsPanel: Error parsing SSE data:', error);
//       }
//     };

//     eventSource.onerror = (error) => {
//       console.error('❌ CallsPanel: SSE connection error:', error);
//     };

//     return () => {
//       eventSource.close();
//     };
//   }, []);

//   return (
//     <div>
//       <h3>Incoming Calls</h3>
//       {incomingCalls.length === 0 ? (
//         <p>No incoming calls yet</p>
//       ) : (
//         <ul>
//           {incomingCalls.map((call, i) => (
//             <li key={i}>
//               From: {call.from} → To: {call.to} at {call.timestamp}
//             </li>
//           ))}
//         </ul>
//       )}

//       <h3 className="mt-4">Missed Calls ({missedCalls.length})</h3>
//       {missedCalls.length === 0 ? (
//         <p>No missed calls</p>
//       ) : (
//         <div className="space-y-2">
//           {missedCalls.map((call, i) => (
//             <div key={i} className={`p-3 border rounded ${call.status === 'ivr_missed'
//               ? 'bg-yellow-50 border-yellow-200'
//               : 'bg-red-50 border-red-200'
//               }`}>
//               <div className="flex justify-between items-start">
//                 <div>
//                   <p><strong>From:</strong> {call.A_PARTY_NO || call.aparty || call.from || call.callerNumber || 'Unknown'}</p>
//                   <p><strong>Type:</strong> {call.call_source || (call.status === 'ivr_missed' ? 'IVR Missed' : 'Missed')}</p>
//                   <p><strong>Time:</strong> {new Date(call.missed_at || call.timestamp).toLocaleString()}</p>
//                   {call.missed_reason && (
//                     <p><strong>Reason:</strong> {call.missed_reason}</p>
//                   )}
//                 </div>
//                 <span className={`px-2 py-1 text-xs rounded ${call.status === 'ivr_missed'
//                   ? 'bg-yellow-200 text-yellow-800'
//                   : 'bg-red-200 text-red-800'
//                   }`}>
//                   {call.status === 'ivr_missed' ? 'IVR' : 'Agent'}
//                 </span>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default CallsPanel;
