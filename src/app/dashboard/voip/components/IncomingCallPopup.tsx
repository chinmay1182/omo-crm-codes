import React, { useState, useEffect } from "react";
import styles from "./IncomingCallPopup.module.css";

interface IncomingCall {
  CALL_ID?: string;
  call_id?: string;
  A_PARTY_NO?: string;
  aparty?: string;
  from?: string;
  B_PARTY_NO?: string;
  bparty?: string;
  to?: string;
  CALL_START_TIME?: string;
  timestamp?: string;
  call_source?: string;
  is_ivr_call?: boolean;
  Agent_number?: string;
  status?: string;
}

interface Props {
  incomingCall: IncomingCall | null;
  cliNumber: string;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallPopup: React.FC<Props> = ({ incomingCall, cliNumber, onAccept, onReject }) => {
  const [contactInfo, setContactInfo] = useState<{ name: string; company?: string } | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);

  // Get the caller's number
  const callerNumber = incomingCall?.A_PARTY_NO || incomingCall?.aparty || incomingCall?.from;

  // Look up contact information when incoming call changes
  useEffect(() => {
    if (!callerNumber) return;

    setLoadingContact(true);
    setContactInfo(null);

    // Search for contact by phone number
    fetch('/api/contacts')
      .then(res => res.json())
      .then(contacts => {
        const contact = contacts.find((c: any) =>
          c.phone === callerNumber || c.mobile === callerNumber
        );

        if (contact) {
          const fullName = `${contact.title || ''} ${contact.first_name || ''} ${contact.last_name || ''}`.trim();
          setContactInfo({
            name: fullName || 'Unknown Contact',
            company: contact.company_name
          });
        }
      })
      .catch(error => {
        console.error('Error fetching contact info:', error);
      })
      .finally(() => {
        setLoadingContact(false);
      });
  }, [callerNumber, incomingCall]);

  if (!incomingCall) {
    return null;
  }

  const isConnected = incomingCall.status === 'Connected';
  const isEnded = incomingCall.status === 'Ended' || incomingCall.status === 'Disconnected';

  return (
    <div className={`${styles.popup} ${isConnected ? styles.connected : ''}`} style={
      isEnded ? { borderLeft: '4px solid #f44336' } :
        isConnected ? { borderLeft: '4px solid #4caf50' } :
          {}
    }>
      <h3>
        {isEnded ? (
          <span style={{ color: '#d32f2f' }}>🔴 Call Ended</span>
        ) : isConnected ? (
          <span style={{ color: '#2e7d32' }}>🟢 Call Connected</span>
        ) : (
          <>
            {incomingCall.is_ivr_call ? '📞 IVR Call' : '📞 Incoming Call'}
            {incomingCall.call_source && (
              <span style={{ fontSize: '12px', color: '#666', display: 'block' }}>
                {incomingCall.call_source}
              </span>
            )}
          </>
        )}
      </h3>
      <p>
        <b>From:</b>{" "}
        {loadingContact ? (
          <span>Looking up contact...</span>
        ) : contactInfo ? (
          <span>
            {contactInfo.name} ({callerNumber})
            {contactInfo.company && ` - ${contactInfo.company}`}
          </span>
        ) : (
          callerNumber || "Unknown"
        )}
      </p>
      {/* Debug Info for Missing Data */}
      <div style={{ fontSize: '10px', color: '#999', marginTop: '5px', display: 'none' }}>
        Debug: ID={incomingCall.CALL_ID || incomingCall.call_id},
        Agent={incomingCall.Agent_number || (incomingCall as any)._original?.Agent_number},
        Original={!!(incomingCall as any)._original}
      </div>
      <p>
        <b>To:</b>{" "}
        {incomingCall.B_PARTY_NO ||
          incomingCall.bparty ||
          incomingCall.to ||
          incomingCall.Agent_number ||
          "Your Number"}
      </p>
      <p>
        <b>Time:</b>{" "}
        {incomingCall.CALL_START_TIME ||
          incomingCall.timestamp ||
          new Date().toLocaleTimeString()}
      </p>
      <p>
        <b>Call ID:</b> {incomingCall.CALL_ID || incomingCall.call_id || "N/A"}
      </p>
      <div className={styles.buttons}>
        {/* Buttons hidden as per user request (Provider functionality pending) */}
        {/* <button onClick={onAccept} className={styles.buttonAccept}>
          Accept
        </button>
        <button onClick={onReject} className={styles.buttonReject}>
          Reject
        </button> */}
        <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', width: '100%' }}>
          Please answer on your physical device / softphone.
        </p>
      </div>
    </div>
  );
};

export default IncomingCallPopup;
