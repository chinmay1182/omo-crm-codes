'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles.module.css';
import { toast } from 'react-hot-toast';
import DOMPurify from 'dompurify';

const sanitize = (content: string) => {
  if (typeof window === 'undefined') return '';
  return DOMPurify.sanitize(content);
};


import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import './quill-global.css';

const ReactQuill = dynamic(async () => {
  const { default: RQ, Quill } = await import('react-quill-new') as any;
  const Font = Quill.import('formats/font');
  Font.whitelist = ['arial', 'verdana', 'times-new-roman', 'georgia', 'courier-new', 'trebuchet-ms', 'plus-jakarta-sans'];
  Quill.register(Font, true);
  return RQ;
}, { ssr: false }) as React.ComponentType<any>;

// Helper for Avatar Colors
const getAvatarColor = (name: string) => {
  const colors = ['#ffe4e6', '#fce7f3', '#fae8ff', '#ede9fe', '#e0f2fe', '#dcfce7', '#fef9c3', '#ffedd5'];
  const textColors = ['#881337', '#831843', '#86198f', '#5b21b6', '#075985', '#166534', '#854d0e', '#9a3412'];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash % colors.length);
  return { bg: colors[index], text: textColors[index] };
};

const getInitials = (name: string) => {
  return name
    .replace(/<[^>]+>/g, '') // remove brackets
    .replace(/['"]/g, '')   // remove quotes
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
};

type Email = {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  body?: string;
  messageId?: string;
  references?: string[];
  attachments?: string | any[]; // JSON string or parsed array
  has_attachments?: boolean;
  to?: string;
  cc?: string;
  thread_count?: number;
  thread_has_attachments?: boolean;
};

const EmailsPage = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [threadMessages, setThreadMessages] = useState<Email[]>([]); // Conversation thread
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(false);



  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [hasGoogleTokens, setHasGoogleTokens] = useState(false);
  const [emailCount, setEmailCount] = useState(50);

  // IMAP Form state removed as configuration is now central via /email-setup

  const [replyBody, setReplyBody] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [replyCc, setReplyCc] = useState('');
  const [replyBcc, setReplyBcc] = useState('');
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('INBOX');

  // Contacts for autocomplete
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Signature State
  const [signature, setSignature] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempSignature, setTempSignature] = useState('');

  // Thread View State
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());

  // Auto-expand the latest message in a thread
  useEffect(() => {
    if (threadMessages.length > 0) {
      const lastMsg = threadMessages[threadMessages.length - 1];
      setExpandedMessageIds(new Set([lastMsg.id]));
    }
  }, [threadMessages]);

  // Fetch Signature
  useEffect(() => {
    const fetchSignature = async () => {
      try {
        const res = await fetch('/api/email/signature');
        if (res.ok) {
          const data = await res.json();
          setSignature(data.signature || '');
        }
      } catch (e) {
        console.error('Error fetching signature', e);
      }
    };
    if (isLoggedIn) fetchSignature();
  }, [isLoggedIn]);

  useEffect(() => {
    // Fetch contacts for autocomplete
    const fetchContacts = async () => {
      try {
        const res = await fetch('/api/contacts');
        if (res.ok) {
          const data = await res.json();
          setAllContacts(data);
        }
      } catch (error) {
        console.error('Failed to fetch contacts', error);
      }
    };
    fetchContacts();
  }, []);

  // Group emails by normalized subject (remove Re:, Fwd:) - MOVED TO TOP LEVEL
  const groupedEmails = React.useMemo(() => {
    const groups: { [key: string]: Email[] } = {};
    emails.forEach(email => {
      const normalizedSubject = (email.subject || '(No Subject)').replace(/^((re|fwd):\s*)+/i, '').trim().toLowerCase();
      if (!groups[normalizedSubject]) {
        groups[normalizedSubject] = [];
      }
      groups[normalizedSubject].push(email);
    });

    // Sort groups by date of most recent email
    return Object.values(groups).map(group => {
      // Sort within group (newest first)
      group.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return group;
    }).sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());
  }, [emails]);

  // New function to fetch emails from local database
  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/emails/list?folder=${currentFolder}&limit=${emailCount}`);
      const data = await res.json();

      if (res.ok) {
        setEmails(data.emails);
      } else {
        console.error('Failed to load emails from DB:', data.error);
        toast.error('Failed to load emails');
      }
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentFolder, emailCount]);

  // Correctly set app element only on client side:
  useEffect(() => {
    checkSession();
  }, []);

  // Fetch from DB when folder changes
  useEffect(() => {
    if (isLoggedIn) {
      // Sync from Gmail first to get latest emails
      fetchImapEmails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder, isLoggedIn]);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const sessionData = await response.json();

      let loggedIn = false;

      if (response.ok && sessionData?.user) {
        loggedIn = true;
      } else {
        const agentRes = await fetch('/api/agent-auth/me');
        if (agentRes.ok) {
          const agentData = await agentRes.json();
          if (agentData.agent) {
            loggedIn = true;
          }
        }
      }

      if (loggedIn) {
        setIsLoggedIn(true);
        setCheckingSession(false);
        // After login, load emails from DB
        fetchEmails();
      } else {
        setCheckingSession(false);
        // Optional: Redirect to login or just show empty state
      }

    } catch (error) {
      console.error('Session check error:', error);
      setCheckingSession(false);
    }
  };


  const fetchImapEmails = async () => {
    setIsLoading(true);

    try {
      // Calls backend which uses centrally configured authority credentials
      const res = await fetch('/api/gmail/fetch-imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: currentFolder,
          limit: emailCount
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'Emails synced successfully');
        fetchEmails(); // Reload from local DB

      } else {
        if (res.status === 403) {
          toast.error('No Email Authority Assigned. Please contact Admin.');
        } else if (res.status === 401) {
          toast.error('Authentication Error. Please contact Admin.');
        } else {
          toast.error(data.error || 'Failed to fetch emails');
        }
      }
    } catch (error) {
      console.error('IMAP fetch error:', error);
      toast.error('Failed to sync emails');
    } finally {
      setIsLoading(false);
    }
  };


  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    attachments: [] as File[]
  });

  const handleSendEmail = async () => {
    if (!composeForm.to || !composeForm.subject || !composeForm.body) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('to', composeForm.to);
      if (composeForm.cc) formData.append('cc', composeForm.cc);
      if (composeForm.bcc) formData.append('bcc', composeForm.bcc);
      formData.append('subject', composeForm.subject);
      formData.append('body', composeForm.body);

      composeForm.attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await fetch('/api/email/send', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Email sent successfully');

        // Clear form BEFORE closing modal to prevent prefill issue
        setComposeForm({ to: '', cc: '', bcc: '', subject: '', body: '', attachments: [] });
        setShowCcBcc(false);
        setIsComposeOpen(false);

        // Switch to Sent folder and sync to show sent email
        setCurrentFolder('Sent');
        setTimeout(() => {
          fetchImapEmails(); // Sync from Gmail
        }, 500);
      } else {
        toast.error(data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error sending email');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!composeForm.to && !composeForm.subject && !composeForm.body) {
      toast.error('Draft is empty');
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('to', composeForm.to || '');
      if (composeForm.cc) formData.append('cc', composeForm.cc);
      if (composeForm.bcc) formData.append('bcc', composeForm.bcc);
      formData.append('subject', composeForm.subject || '(No Subject)');
      formData.append('body', composeForm.body || '');

      composeForm.attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await fetch('/api/email/draft', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Draft saved successfully');

        // Clear form BEFORE closing modal to prevent prefill issue
        setComposeForm({ to: '', cc: '', bcc: '', subject: '', body: '', attachments: [] });
        setShowCcBcc(false);
        setIsComposeOpen(false);

        // Switch to Drafts folder
        setCurrentFolder('Drafts');

        // Wait a bit for folder switch, then sync from Gmail to show the draft
        setTimeout(() => {
          fetchImapEmails();
        }, 500);
      } else {
        toast.error(data.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error saving draft');
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setComposeForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...Array.from(e.target.files || [])]
      }));
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setComposeForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  /* Reply State */
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [replyTargetEmail, setReplyTargetEmail] = useState<Email | null>(null);

  const handleReplyAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReplyAttachments(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const handleRemoveReplyAttachment = (index: number) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendReply = async () => {
    if (!replyBody.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const targetEmail = replyTargetEmail || selectedEmail;
    if (!targetEmail) {
      toast.error('No email selected');
      return;
    }

    setIsSending(true);
    try {
      let subject = targetEmail.subject || '';
      if (!subject.toLowerCase().startsWith('re:')) {
        subject = `Re: ${subject}`;
      }

      const formData = new FormData();
      formData.append('to', replyTo);
      if (replyCc) formData.append('cc', replyCc);
      if (replyBcc) formData.append('bcc', replyBcc);
      formData.append('subject', subject);
      formData.append('body', replyBody);

      // Threading headers
      if (targetEmail.messageId) {
        formData.append('inReplyTo', targetEmail.messageId);
        // If the target has references, append the target's ID to them. 
        // If not, start references with target's ID.
        // Gmail usually expects: [original_references, in_reply_to_id]
        const refs = Array.isArray(targetEmail.references)
          ? [...targetEmail.references, targetEmail.messageId]
          : (targetEmail.references ? [String(targetEmail.references), targetEmail.messageId] : [targetEmail.messageId]);

        formData.append('references', JSON.stringify(refs.filter(Boolean)));
      }

      replyAttachments.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await fetch('/api/email/send', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Reply sent successfully');

        // Add reply to thread view
        if (targetEmail) {
          const newReply: Email = {
            id: `reply-${Date.now()}`,
            subject: subject,
            from: `Me`,
            date: new Date().toISOString(),
            snippet: replyBody.replace(/<[^>]+>/g, '').substring(0, 100),
            body: replyBody,
            messageId: data.messageId,
            references: [
              ...(Array.isArray(targetEmail.references)
                ? targetEmail.references
                : (targetEmail.references ? [String(targetEmail.references)] : [])),
              targetEmail.messageId
            ].filter(Boolean) as string[]
          };

          setThreadMessages(prev => {
            const updated = [...prev, newReply];
            updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return updated;
          });
          setExpandedMessageIds(prev => new Set([...prev, newReply.id]));
        }

        setReplyBody('');
        setReplyAttachments([]);
        setIsReplyOpen(false);
        setReplyTargetEmail(null);
      } else {
        toast.error(data.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Send reply error:', error);
      toast.error('Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveReplyDraft = async () => {
    if (!replyBody.trim() && replyAttachments.length === 0) {
      toast.error('Draft is empty');
      return;
    }

    setIsSending(true);
    try {
      let subject = selectedEmail?.subject || '';
      if (!subject.toLowerCase().startsWith('re:')) {
        subject = `Re: ${subject}`;
      }

      const formData = new FormData();
      formData.append('to', replyTo || '');
      if (replyCc) formData.append('cc', replyCc);
      if (replyBcc) formData.append('bcc', replyBcc);
      formData.append('subject', subject);
      formData.append('body', replyBody || '');

      // Threading headers
      if (selectedEmail?.messageId) {
        formData.append('inReplyTo', selectedEmail.messageId);
      }

      replyAttachments.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await fetch('/api/email/draft', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Reply draft saved successfully');
        setReplyBody('');
        setReplyAttachments([]);
        setIsReplyOpen(false);
        setIsEmailModalOpen(false); // Close the email modal

        // Switch to Drafts folder
        setCurrentFolder('Drafts');

        // Wait a bit for folder switch, then sync from Gmail to show the draft
        setTimeout(() => {
          fetchImapEmails();
        }, 500);
      } else {
        toast.error(data.error || 'Failed to save reply draft');
      }
    } catch (error) {
      console.error('Save reply draft error:', error);
      toast.error('Failed to save reply draft');
    } finally {
      setIsSending(false);
    }
  };



  const handleDeleteEmail = async () => {
    if (!selectedEmail) return;
    if (!confirm('Are you sure you want to delete this email?')) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/email/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: selectedEmail.id,
          folderName: currentFolder, // Send current folder
        }),
      });

      if (res.ok) {
        toast.success('Email deleted');
        setEmails(prev => prev.filter(e => e.id !== selectedEmail.id));
        setIsEmailModalOpen(false);
      } else {
        toast.error('Failed to delete email');
      }
    } catch (error) {
      console.error('Delete email error:', error);
      toast.error('Failed to delete email');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditDraft = () => {
    if (!selectedEmail) return;

    // Parse 'to' field - drafts might have the recipient in 'to' field
    const toField = (selectedEmail as any).to || '';
    const toEmail = toField.match(/<(.+)>/)?.[1] || toField || '';

    // Load draft into compose form
    setComposeForm({
      to: toEmail,
      cc: '',
      bcc: '',
      subject: selectedEmail.subject || '',
      body: selectedEmail.body || '',
      attachments: []
    });

    // Close email modal and open compose modal
    setIsEmailModalOpen(false);
    setIsComposeOpen(true);
  };

  const handleOpenCompose = () => {
    // Clear form before opening to prevent prefill from previous draft edit
    // Append signature if available (sanitize <p> tags to remove extra spacing)
    const cleanSignature = signature.replace(/<p>/g, '<p style="margin: 0;">');
    const initialBody = signature ? `<br><br><br>--<br>${cleanSignature}` : '';
    setComposeForm({ to: '', cc: '', bcc: '', subject: '', body: initialBody, attachments: [] });
    setShowCcBcc(false);
    setIsComposeOpen(true);
  };

  const [activeRecipientField, setActiveRecipientField] = useState<'to' | 'cc' | 'bcc'>('to');

  const handleRecipientChange = (field: 'to' | 'cc' | 'bcc', value: string) => {
    setComposeForm(prev => ({ ...prev, [field]: value }));
    setActiveRecipientField(field);

    if (value.length > 1) {
      const filtered = allContacts.filter(c =>
        (c.first_name + ' ' + c.last_name).toLowerCase().includes(value.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 5);
      setContactSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectContact = (contact: any) => {
    const emailStr = contact.email ? `${contact.first_name} ${contact.last_name} <${contact.email}>` : '';
    setComposeForm(prev => ({ ...prev, [activeRecipientField]: emailStr }));
    setShowSuggestions(false);
  };

  const searchEmails = () => {
    if (!searchQuery.trim()) {
      fetchImapEmails();
    } else {
      const filtered = emails.filter((email: Email) =>
        email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.snippet.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setEmails(filtered);
    }
  };

  /* Thread Fetching */
  const currentEmailIdRef = React.useRef<string | null>(null);

  const fetchThread = async (targetEmail: Email) => {
    try {
      const res = await fetch('/api/email/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: targetEmail.subject,
          messageId: targetEmail.messageId,
          references: targetEmail.references || [],
          folder: currentFolder
        })
      });
      if (res.ok) {
        const thread = await res.json();

        // Prevent race condition: Only update if this is still the selected email
        if (currentEmailIdRef.current === targetEmail.id) {
          if (thread && thread.length > 0) {
            // Deduplicate emails based on messageId or id
            const uniqueEmails = thread.reduce((acc: Email[], email: Email) => {
              const existingIndex = acc.findIndex(e =>
                (e.messageId && email.messageId && e.messageId === email.messageId) ||
                (e.id === email.id)
              );

              if (existingIndex === -1) {
                // Not a duplicate, add it
                acc.push(email);
              } else {
                // Duplicate found - merge intelligently
                const existing = acc[existingIndex];

                // Preserve original email's To/CC fields if they exist
                // (Thread API might not return these properly for sent emails)
                const merged = {
                  ...email,
                  // Keep existing To/CC if they're more complete
                  to: existing.to || email.to,
                  cc: existing.cc || email.cc,
                  // Keep attachments if present in either
                  has_attachments: existing.has_attachments || email.has_attachments,
                  attachments: existing.attachments || email.attachments
                };

                acc[existingIndex] = merged;
              }
              return acc;
            }, [targetEmail]); // Start with original email to preserve its data

            setThreadMessages(uniqueEmails);
          } else {
            // If thread fetch returns nothing (rare), keep the original selected email
            console.warn("Thread fetch returned empty, keeping original.");
          }
        }
      }
    } catch (e) {
      console.error("Thread fetch error", e);
    }
  };

  const openEmailModal = (email: Email) => {
    setSelectedEmail(email);
    currentEmailIdRef.current = email.id; // Track current email
    setThreadMessages([email]); // Show selected immediately
    setIsEmailModalOpen(true);
    setIsReplyOpen(false);

    const cleanSignature = signature.replace(/<p>/g, '<p style="margin: 0;">');
    const originalDate = new Date(email.date).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const trailMail = `
      <br><br>
      <div class="gmail_quote">
        On ${originalDate}, ${email.from.replace(/</g, '&lt;').replace(/>/g, '&gt;')} wrote:<br>
        <blockquote class="gmail_quote" style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">
          ${email.body || email.snippet}
        </blockquote>
      </div>
    `;
    setReplyBody((signature ? `<br><br><br>--<br>${cleanSignature}` : '') + trailMail);

    // Initialize reply fields
    let replyAddress = '';

    // If viewing Sent folder, reply to the recipient (To) instead of sender (From)
    if (currentFolder === 'Sent' || currentFolder.toLowerCase().includes('sent')) {
      // Extract email from To field
      const toField = email.to || '';
      replyAddress = toField.match(/<(.+)>/)?.[1] || toField.trim();
    } else {
      // For inbox/other folders, reply to sender (From)
      const fromField = email.from || '';
      replyAddress = fromField.match(/<(.+)>/)?.[1] || fromField.trim();
    }

    setReplyTo(replyAddress);
    setReplyCc('');
    setReplyBcc('');

    fetchThread(email);
  };

  if (checkingSession) {
    return (
      <div className={styles.container}>
        <div className={styles.checkingSession}>
          <i className="fa-light fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
          Verifying session...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Top Navigation Bar */}
      <div className={styles.topNav}>
        <div className={styles.navTabsContainer}>
          {['INBOX', 'Sent', 'Drafts', 'Trash', 'Signature Settings'].map(folder => (
            <button
              key={folder}
              onClick={() => {
                setCurrentFolder(folder);
                if (folder === 'Signature Settings') {
                  setTempSignature(signature); // Initialize temp signature when switching to tab
                }
              }}
              className={`${styles.navTab} ${currentFolder === folder ? styles.navTabActive : ''}`}
            >
              {folder === 'INBOX' ? 'Inbox' : folder}
            </button>
          ))}
        </div>

        <div className={styles.topActions}>
          {currentFolder !== 'Signature Settings' && (
            <>
              <div className={styles.searchBar}>
                <i className="fa-light fa-search" style={{ position: 'absolute', left: '12px', fontSize: '18px', color: '#94a3b8' }}></i>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && searchEmails()}
                />
              </div>

              <select
                value={emailCount}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEmailCount(parseInt(e.target.value))}
                className={styles.emailCountSelect}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                onClick={() => fetchImapEmails()}
                disabled={isLoading}
                className={styles.topActionButton}
                title="Refresh"
              >
                <i className={`fa-light fa-sync ${isLoading ? 'fa-spin' : ''}`}></i>
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.contentArea}>
        {currentFolder === 'Signature Settings' ? (
          <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>Email Signature</h2>
            <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '14px' }}>
              Design your email signature below. This will be automatically appended to all new emails and replies.
            </p>

            <div className={styles.editorContainer} style={{ height: '300px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <ReactQuill
                theme="snow"
                value={tempSignature}
                onChange={setTempSignature}
                modules={{
                  toolbar: [
                    [{ 'font': [] }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link', 'image'],
                    ['clean']
                  ]
                }}
                style={{ height: '250px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/email/signature', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ signature: tempSignature })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setSignature(data.signature || tempSignature);
                      toast.success('Signature saved');
                    } else {
                      toast.error('Failed to save signature');
                    }
                  } catch (e) {
                    console.error(e);
                    toast.error('Error saving signature');
                  }
                }}
                className={styles.sendBtn}
              >
                <i className="fa-light fa-save" style={{ marginRight: '8px' }}></i>
                Save Signature
              </button>
            </div>
          </div>
        ) : needsGoogleAuth ? (
          <div className={styles.emptyState}>
            <i className="fa-brands fa-google"></i>
            <h2>Connect your Google Account</h2>
            <p>To view and send emails, you need to sign in with Google.</p>
            <button
              onClick={() => window.location.href = '/api/auth/google'}
              style={{
                marginTop: '20px',
                background: '#15426d',
                color: 'white',
                padding: '10px 24px',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Sign In with Google
            </button>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
          </div>
        ) : emails.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fa-light fa-inbox"></i>
            <h2>No emails found</h2>
            <p>Your {currentFolder.toLowerCase()} is empty.</p>
            <button onClick={() => fetchImapEmails()} className={styles.topActionButton} style={{ marginTop: '16px' }}>
              <i className="fa-light fa-sync"></i> Refresh
            </button>
          </div>
        ) : (
          <div className={styles.emailList}>
            {groupedEmails.map(group => {
              const email = group[0];
              const count = Math.max(email.thread_count || 0, group.length);

              const senderName = (email.from.replace(/<.*>/, '').trim() || email.from).replace(/['"]/g, '');
              const { bg, text } = getAvatarColor(senderName);
              const initials = getInitials(senderName);

              return (
                <div
                  key={email.id}
                  className={styles.emailItem}
                  onClick={() => openEmailModal(email)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className={styles.avatar} style={{ backgroundColor: bg, color: text }}>
                      {initials}
                    </div>

                    <div className={styles.sender}>
                      {senderName}
                    </div>
                  </div>

                  <div className={styles.subjectSnippet}>
                    <span className={styles.subject}>
                      {/* Thread Counter Bubble */}
                      {count > 1 && (
                        <span className={styles.threadCounter}>{count}</span>
                      )}
                      {email.subject || '(No Subject)'}
                    </span>
                    <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                    <span className={styles.snippet}>{(email.snippet || '').replace(/<[^>]+>/g, '')}</span>
                  </div>

                  <div className={styles.metaInfo}>
                    {/* Attachment Indicator */}
                    {(() => {
                      const hasAtt = email.has_attachments || email.attachments;
                      const groupHasAtt = group.find(e => e.has_attachments || e.attachments);

                      if (hasAtt || groupHasAtt) {
                        let attName = 'Attachment';
                        try {
                          const target = email.attachments ? email : groupHasAtt;
                          if (target && target.attachments) {
                            const parsed = typeof target.attachments === 'string' ? JSON.parse(target.attachments) : target.attachments;
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              attName = parsed[0].filename || 'Attachment';
                            }
                          }
                        } catch (e) { }

                        return (
                          <span className={styles.attachmentIndicator}>
                            <i className="fa-light fa-paperclip" style={{ fontSize: '12px' }}></i>
                            <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {attName}
                            </span>
                          </span>
                        );
                      }
                      return null;
                    })()}

                    <span className={styles.date}>
                      {new Date(email.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Compose Button - Valid for all tabs except Signature Settings */}
      {currentFolder !== 'Signature Settings' && (
        <button
          className={styles.fab}
          onClick={handleOpenCompose}
          title="Compose Email"
        >
          <i className="fa-light fa-pen"></i>
        </button>
      )}





      {/* Email View Modal */}
      {isEmailModalOpen && selectedEmail && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setIsEmailModalOpen(false) }}>
          <div className={styles.modalContent} id="email-view-modal-content">
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 className={styles.modalTitle}>{selectedEmail.subject}</h2>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Print Thread Button */}
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const msgsToPrint = threadMessages.length > 0 ? threadMessages : [selectedEmail];

                      const contentHtml = msgsToPrint.map(msg => {
                        let attsHtml = '';
                        if (msg.has_attachments && msg.attachments) {
                          try {
                            const atts = typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : msg.attachments;
                            if (Array.isArray(atts) && atts.length > 0) {
                              attsHtml = `<div class="attachment"><strong>Attachments:</strong> ${atts.map((a: any) => a.filename).join(', ')}</div>`;
                            }
                          } catch (e) { }
                        }
                        return `
                          <div class="message-block">
                            <div class="header">
                              <div class="meta"><span class="label">From:</span> ${msg.from}</div>
                              ${msg.to ? `<div class="meta"><span class="label">To:</span> ${msg.to}</div>` : ''}
                              ${msg.cc ? `<div class="meta"><span class="label">Cc:</span> ${msg.cc}</div>` : ''}
                              <div class="meta"><span class="label">Date:</span> ${new Date(msg.date).toLocaleString()}</div>
                              <div class="meta"><span class="label">Subject:</span> ${msg.subject}</div>
                            </div>
                            <div class="content">${sanitize(msg.body || msg.snippet)}</div>
                            ${attsHtml}
                          </div>
                          <hr/>
                        `;
                      }).join('');

                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Print Thread - ${selectedEmail.subject}</title>
                            <style>
                              body { font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333; }
                              .message-block { margin-bottom: 30px; }
                              .header { background: #f8fafc; padding: 15px; border-radius: 4px; margin-bottom: 15px; }
                              .meta { font-size: 13px; color: #666; margin-bottom: 4px; }
                              .label { font-weight: bold; width: 60px; display: inline-block; }
                              .content { white-space: normal; font-size: 14px; }
                              .content p { margin: 0 !important; padding: 0 !important; line-height: 1.2 !important; }
                              .content br { display: block; content: ""; margin: 0; }
                              blockquote { margin: 10px 0; border-left: 3px solid #ccc; padding-left: 10px; }
                              .attachment { margin-top: 10px; font-size: 12px; color: #666; }
                              hr { border: 0; border-top: 1px dashed #ccc; margin: 30px 0; }
                            </style>
                          </head>
                          <body>
                            <h2>Conversation History: ${selectedEmail.subject}</h2>
                             <div class="meta" style="margin-bottom: 20px;">Printed on ${new Date().toLocaleString()}</div>
                            ${contentHtml}
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }
                  }}
                  className={styles.iconButton}
                  title="Print Entire Thread"
                >
                  <i className="fa-light fa-print-search"></i>
                </button>

                {/* Print Single Email Button */}
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');

                    // Prefer full email from thread if available to ensure body is present
                    const fullEmail = threadMessages.find(e => e.id === selectedEmail.id) || selectedEmail;

                    // Parse attachments safely for print
                    let attachmentHtml = '';
                    if (fullEmail.has_attachments && fullEmail.attachments) {
                      try {
                        const atts = typeof fullEmail.attachments === 'string'
                          ? JSON.parse(fullEmail.attachments)
                          : fullEmail.attachments;

                        if (Array.isArray(atts) && atts.length > 0) {
                          attachmentHtml = `
                                    <div class="attachment">
                                        <strong>Attachments (${atts.length}):</strong>
                                        <ul style="margin-top: 5px; padding-left: 20px;">
                                            ${atts.map((a: any) => `<li>${a.filename || 'Unknown'} (${a.size ? Math.round(a.size / 1024) + ' KB' : 'Unknown'})</li>`).join('')}
                                        </ul>
                                    </div>
                                `;
                        }
                      } catch (e) {
                        console.error('Error parsing attachments for print', e);
                      }
                    }

                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Print Email - ${fullEmail.subject}</title>
                            <style>
                              body { font-family: sans-serif; padding: 20px; line-height: 1.4; color: #333; }
                              .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                              .meta { color: #666; font-size: 14px; margin-bottom: 5px; }
                              .label { font-weight: bold; width: 60px; display: inline-block; }
                              .content { white-space: normal; margin-bottom: 30px; font-size: 14px; }
                              .content p { margin: 0 !important; padding: 0 !important; line-height: 1.2 !important; }
                              .content br { display: block; content: ""; margin: 0; }
                              blockquote { margin: 10px 0; border-left: 3px solid #ccc; padding-left: 10px; }
                              .attachment { margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h2>${fullEmail.subject}</h2>
                              <div class="meta"><span class="label">From:</span> ${fullEmail.from}</div>
                              <div class="meta"><span class="label">To:</span> ${fullEmail.to || 'Me'}</div>
                              ${fullEmail.cc ? `<div class="meta"><span class="label">Cc:</span> ${fullEmail.cc}</div>` : ''}
                              <div class="meta"><span class="label">Date:</span> ${new Date(fullEmail.date).toLocaleString()}</div>
                            </div>
                            <div class="content">
                              ${sanitize(fullEmail.body || fullEmail.snippet)}
                            </div>
                            ${attachmentHtml}
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }
                  }}
                  className={styles.iconButton}
                  title="Print Email"
                >
                  <i className="fa-light fa-print"></i>
                </button>

                {/* Show Edit button only for Drafts folder */}
                {currentFolder === 'Drafts' && (
                  <button
                    onClick={handleEditDraft}
                    className={styles.iconButton}
                    title="Edit Draft"
                    style={{ backgroundColor: '#4f46e5', color: 'white' }}
                  >
                    <i className="fa-light fa-pen"></i>
                  </button>
                )}

                <button
                  onClick={() => setIsReplyOpen(!isReplyOpen)}
                  className={styles.iconButton}
                  title="Reply"
                  style={{ backgroundColor: isReplyOpen ? '#e9ecef' : 'transparent' }}
                >
                  <i className="fa-light fa-reply"></i>
                </button>

                <button onClick={() => setIsEmailModalOpen(false)} className={styles.closeButton}>
                  <i className="fa-light fa-times"></i>
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              {threadMessages.map((msg, index) => {
                const isExpanded = expandedMessageIds.has(msg.id);

                return (
                  <div key={msg.id}>
                    {!isExpanded ? (
                      // Collapsed View
                      <div
                        onClick={() => {
                          const newSet = new Set(expandedMessageIds);
                          newSet.add(msg.id);
                          setExpandedMessageIds(newSet);
                        }}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px 20px',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      >
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', overflow: 'hidden', flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', width: '200px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {msg.from.split('<')[0].trim() || msg.from}
                          </span>
                          {msg.has_attachments && (
                            <i className="fa-light fa-paperclip" style={{ color: '#64748b', fontSize: '13px', marginLeft: '4px', marginRight: '4px' }}></i>
                          )}
                          <span style={{ fontSize: '13px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {(msg.snippet || '').substring(0, 100)}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                          {new Date(msg.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    ) : (
                      // Expanded View
                      <div className={styles.messageCard}>
                        <div
                          className={styles.messageHeader}
                          onClick={() => {
                            const newSet = new Set(expandedMessageIds);
                            newSet.delete(msg.id);
                            setExpandedMessageIds(newSet);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div>
                            <span className={styles.senderName}>{msg.from}</span>
                            {msg.has_attachments && (
                              <i className="fa-light fa-paperclip" style={{ color: '#64748b', fontSize: '14px', marginLeft: '8px' }}></i>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className={styles.messageDate} style={{ marginRight: '8px' }}>
                              {new Date(msg.date).toLocaleString()}
                            </div>

                            {/* Reply Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyTargetEmail(msg);
                                setIsReplyOpen(true);

                                const fromEmail = (msg.from.match(/<(.+)>/)?.[1] || msg.from).trim();
                                const toEmail = (msg.to?.match(/<(.+)>/)?.[1] || msg.to || '').trim();
                                const replyAddress = fromEmail.includes('@') ? fromEmail : toEmail;
                                setReplyTo(replyAddress);

                                const cleanSig = signature.replace(/<p>/g, '<p style="margin: 0;">');
                                const originalDate = new Date(msg.date).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                const trailMail = `
                                  <br><br>
                                  <div class="gmail_quote">
                                    On ${originalDate}, ${msg.from.replace(/</g, '&lt;').replace(/>/g, '&gt;')} wrote:<br>
                                    <blockquote class="gmail_quote" style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">
                                      ${msg.body || msg.snippet}
                                    </blockquote>
                                  </div>
                                `;
                                setReplyBody((signature ? `<br><br><br>--<br>${cleanSig}` : '') + trailMail);
                              }}
                              className={styles.iconButton}
                              style={{ width: '32px', height: '32px', backgroundColor: 'white', border: '1px solid #cbd5e1' }}
                              title="Reply"
                            >
                              <i className="fa-light fa-reply"></i>
                            </button>

                            {/* Reply All Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyTargetEmail(msg);
                                setIsReplyOpen(true);
                                setShowCcBcc(true); // Open CC fields

                                // To: Sender
                                const fromEmail = (msg.from.match(/<(.+)>/)?.[1] || msg.from).trim();
                                const toEmail = (msg.to?.match(/<(.+)>/)?.[1] || msg.to || '').trim();
                                const replyAddress = fromEmail.includes('@') ? fromEmail : toEmail;
                                setReplyTo(replyAddress);

                                // CC: Original recipients (excluding self)
                                const ccList: string[] = [];
                                if (msg.to) {
                                  const toAddresses = msg.to.split(',').map(a => a.trim());
                                  toAddresses.forEach(addr => {
                                    const email = addr.match(/<(.+)>/)?.[1] || addr;
                                    if (email !== replyAddress && email.includes('@')) {
                                      ccList.push(email);
                                    }
                                  });
                                }
                                if (msg.cc) {
                                  const ccAddresses = msg.cc.split(',').map(a => a.trim());
                                  ccAddresses.forEach(addr => {
                                    const email = addr.match(/<(.+)>/)?.[1] || addr;
                                    if (email.includes('@') && !ccList.includes(email)) {
                                      ccList.push(email);
                                    }
                                  });
                                }
                                setReplyCc(ccList.join(', '));

                                const cleanSig = signature.replace(/<p>/g, '<p style="margin: 0;">');
                                const originalDate = new Date(msg.date).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                const trailMail = `
                                  <br><br>
                                  <div class="gmail_quote">
                                    On ${originalDate}, ${msg.from.replace(/</g, '&lt;').replace(/>/g, '&gt;')} wrote:<br>
                                    <blockquote class="gmail_quote" style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">
                                      ${msg.body || msg.snippet}
                                    </blockquote>
                                  </div>
                                `;
                                setReplyBody((signature ? `<br><br><br>--<br>${cleanSig}` : '') + trailMail);
                              }}
                              className={styles.iconButton}
                              style={{ width: '32px', height: '32px', backgroundColor: 'white', border: '1px solid #cbd5e1' }}
                              title="Reply All"
                            >
                              <i className="fa-light fa-reply-all"></i>
                            </button>

                            {/* Print Individual Message Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const printWindow = window.open('', '_blank');

                                // Parse attachments safely for print
                                let attachmentHtml = '';
                                if (msg.has_attachments && msg.attachments) {
                                  try {
                                    const atts = typeof msg.attachments === 'string'
                                      ? JSON.parse(msg.attachments)
                                      : msg.attachments;

                                    if (Array.isArray(atts) && atts.length > 0) {
                                      attachmentHtml = `
                                        <div class="attachment">
                                          <strong>Attachments (${atts.length}):</strong>
                                          <ul style="margin-top: 5px; padding-left: 20px;">
                                            ${atts.map((a: any) => `<li>${a.filename || 'Unknown'} (${a.size ? Math.round(a.size / 1024) + ' KB' : 'Unknown'})</li>`).join('')}
                                          </ul>
                                        </div>
                                      `;
                                    }
                                  } catch (e) {
                                    console.error('Error parsing attachments for print', e);
                                  }
                                }

                                if (printWindow) {
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>Print Email - ${msg.subject}</title>
                                        <style>
                                          body { font-family: sans-serif; padding: 20px; line-height: 1.4; color: #333; }
                                          .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                                          .meta { color: #666; font-size: 14px; margin-bottom: 5px; }
                                          .label { font-weight: bold; width: 60px; display: inline-block; }
                                          .content { white-space: normal; margin-bottom: 30px; font-size: 14px; }
                                          .content p { margin: 0 !important; padding: 0 !important; line-height: 1.2 !important; }
                                          .content br { display: block; content: ""; margin: 0; }
                                          blockquote { margin: 10px 0; border-left: 3px solid #ccc; padding-left: 10px; }
                                          .attachment { margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="header">
                                          <h2>${msg.subject}</h2>
                                          <div class="meta"><span class="label">From:</span> ${msg.from}</div>
                                          <div class="meta"><span class="label">To:</span> ${msg.to || 'Me'}</div>
                                          ${msg.cc ? `<div class="meta"><span class="label">Cc:</span> ${msg.cc}</div>` : ''}
                                          <div class="meta"><span class="label">Date:</span> ${new Date(msg.date).toLocaleString()}</div>
                                        </div>
                                        <div class="content">
                                          ${msg.body || msg.snippet}
                                        </div>
                                        ${attachmentHtml}
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                  printWindow.focus();
                                  printWindow.print();
                                }
                              }}
                              className={styles.iconButton}
                              style={{ width: '32px', height: '32px', backgroundColor: 'white', border: '1px solid #cbd5e1' }}
                              title="Print This Email"
                            >
                              <i className="fa-light fa-print"></i>
                            </button>
                          </div>
                        </div>

                        {/* Recipient Details */}
                        <div style={{ padding: '0 20px 12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b' }}>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#475569' }}>To: </span>
                            {msg.to || 'Me'}
                          </div>
                          {msg.cc && (
                            <div>
                              <span style={{ fontWeight: 600, color: '#475569' }}>Cc: </span>
                              {msg.cc}
                            </div>
                          )}
                        </div>

                        <div className={styles.messageBody}>
                          {String(msg.id).startsWith('reply-') ? (
                            <div className="ql-editor" dangerouslySetInnerHTML={{ __html: sanitize(msg.body || '') }} style={{ padding: 0 }} />
                          ) : (
                            <iframe
                              title={`Email Content ${index}`}
                              srcDoc={`
                                <style>
                                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; margin: 0; }
                                  p { margin: 0; padding: 0; }
                                  blockquote { margin: 10px 0; padding-left: 10px; border-left: 3px solid #cbd5e1; color: #64748b; }
                                </style>
                                ${msg.body || msg.snippet}
                              `}
                              style={{ width: '100%', border: 'none', minHeight: '300px' }}
                              sandbox="allow-same-origin"
                            />
                          )}
                        </div>

                        {/* Display Attachments */}
                        {msg.has_attachments && msg.attachments && (() => {
                          const attachments = typeof msg.attachments === 'string'
                            ? JSON.parse(msg.attachments)
                            : msg.attachments;

                          return attachments.length > 0 && (
                            <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fa-light fa-paperclip"></i>
                                {attachments.length} Attachment{attachments.length > 1 ? 's' : ''}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {attachments.map((att: any, attIndex: number) => (
                                  <div key={attIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                    <i className="fa-light fa-file" style={{ color: '#64748b', fontSize: '16px' }}></i>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{att.filename}</div>
                                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                        {att.size ? `${(att.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}

              {isReplyOpen && (
                <div style={{ borderTop: '1px solid #e2e8f0', padding: '20px', backgroundColor: '#f8fafc', marginTop: '20px', borderRadius: '0 0 8px 8px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    {replyTargetEmail && (
                      <div style={{
                        fontSize: '12px',
                        color: '#0f172a',
                        marginBottom: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #dbeafe',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        gap: '8px'
                      }}>
                        <i className="fa-light fa-reply" style={{ color: '#2563eb' }}></i>
                        <span style={{ flex: 1 }}>
                          Replying to <strong>{replyTargetEmail.from.split('<')[0]}</strong>'s message from {new Date(replyTargetEmail.date).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => {
                            setReplyTargetEmail(null);
                            setReplyTo(selectedEmail?.from || '');
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px' }}
                          title="Cancel reply to specific message"
                        >
                          <i className="fa-light fa-times"></i>
                        </button>
                      </div>
                    )}
                    <div className={styles.formGroup}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>To</label>
                        <span
                          onClick={() => setShowCcBcc(!showCcBcc)}
                          style={{ fontSize: '12px', color: '#11a454', cursor: 'pointer', fontWeight: 500 }}
                        >
                          Cc/Bcc
                        </span>
                      </div>
                      <input
                        type="text"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                      />
                    </div>
                    {showCcBcc && (
                      <>
                        <div className={styles.formGroup}>
                          <label>Cc</label>
                          <input
                            type="text"
                            value={replyCc}
                            onChange={(e) => setReplyCc(e.target.value)}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Bcc</label>
                          <input
                            type="text"
                            value={replyBcc}
                            onChange={(e) => setReplyBcc(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className={styles.editorContainer}>
                    <ReactQuill
                      theme="snow"
                      value={replyBody}
                      onChange={setReplyBody}
                      placeholder="Type your reply here..."
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, false] }],
                          ['bold', 'italic', 'underline', 'link', 'blockquote'],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          ['clean']
                        ],
                      }}
                    />
                  </div>

                  {/* Reply Attachments UI */}
                  {replyAttachments.length > 0 && (
                    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {replyAttachments.map((file, index) => (
                          <div key={index} className={styles.attachmentChip}>
                            <i className="fa-light fa-paperclip" style={{ color: '#5f6368' }}></i>
                            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {file.name}
                            </span>
                            <button
                              onClick={() => handleRemoveReplyAttachment(index)}
                              className={styles.attachmentRemove}
                            >
                              <i className="fa-solid fa-times-circle"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.formActions}>
                    <label className={styles.secondaryBtn} title="Attach File" style={{ marginRight: 'auto' }}>
                      <span style={{ fontSize: '15px' }}>Attach</span>
                      <input type="file" multiple onChange={handleReplyAttachmentChange} style={{ display: 'none' }} />
                    </label>

                    <button
                      onClick={() => setIsReplyOpen(false)}
                      className={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveReplyDraft}
                      disabled={isSending}
                      className={styles.cancelBtn}
                    >
                      {isSending ? 'Saving...' : 'Draft'}
                    </button>
                    <button
                      onClick={handleSendReply}
                      disabled={isSending}
                      className={styles.saveBtn}
                    >
                      {isSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>

              )}

              {!isReplyOpen && (
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    className={styles.cancelBtn}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setIsReplyOpen(true);

                      // Smart reply logic for Sent folder
                      let replyAddress = selectedEmail.from;
                      if (currentFolder === 'Sent' || currentFolder.toLowerCase().includes('sent')) {
                        replyAddress = selectedEmail.to || selectedEmail.from;
                      }
                      const targetEmail = replyAddress.match(/<(.+)>/)?.[1] || replyAddress;
                      setReplyTo(targetEmail);

                      const cleanSignature = signature.replace(/<p>/g, '<p style="margin: 0;">');
                      const originalDate = new Date(selectedEmail.date).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      const trailMail = `
                        <br><br>
                        <div class="gmail_quote">
                          On ${originalDate}, ${selectedEmail.from.replace(/</g, '&lt;').replace(/>/g, '&gt;')} wrote:<br>
                          <blockquote class="gmail_quote" style="margin: 0px 0px 0px 0.8ex; border-left: 1px solid rgb(204, 204, 204); padding-left: 1ex;">
                            ${selectedEmail.body || selectedEmail.snippet}
                          </blockquote>
                        </div>
                      `;
                      setReplyBody((signature ? `<br><br><br>--<br>${cleanSignature}` : '') + trailMail);

                      // Scroll to bottom
                      setTimeout(() => {
                        const modalContent = document.getElementById('email-view-modal-content');
                        if (modalContent) modalContent.scrollTop = modalContent.scrollHeight;
                      }, 100);
                    }}
                    className={styles.saveBtn}
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMAP Credentials Modal - REMOVED */}

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setIsComposeOpen(false) }}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Compose Email</h2>
              <button onClick={() => setIsComposeOpen(false)} className={styles.closeButton}>
                <i className="fa-light fa-xmark"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* To Field with CC/BCC toggle */}
              {/* To Field with CC/BCC toggle and Suggestions */}
              {/* To Field with CC/BCC toggle and Suggestions */}
              <div className={styles.formGroup} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label>To</label>
                  {!showCcBcc && (
                    <span
                      onClick={() => setShowCcBcc(true)}
                      style={{ fontSize: '12px', color: '#11a454', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Cc/Bcc
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={composeForm.to}
                  onChange={(e) => handleRecipientChange('to', e.target.value)}
                  onFocus={() => { setActiveRecipientField('to'); if (composeForm.to && composeForm.to.length > 1) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Recipient"
                  autoComplete="off"
                />

                {/* Suggestions Dropdown To */}
                {activeRecipientField === 'to' && showSuggestions && contactSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    right: '0',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {contactSuggestions.map((contact, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectContact(contact)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: idx < contactSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                          {contact.first_name} {contact.last_name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {contact.email}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CC and BCC Fields */}
              {showCcBcc && (
                <>
                  <div className={styles.formGroup} style={{ position: 'relative' }}>
                    <label>Cc</label>
                    <input
                      type="text"
                      value={composeForm.cc}
                      onChange={(e) => handleRecipientChange('cc', e.target.value)}
                      onFocus={() => { setActiveRecipientField('cc'); if (composeForm.cc && composeForm.cc.length > 1) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Cc"
                      autoComplete="off"
                    />

                    {/* Suggestions Dropdown Cc */}
                    {activeRecipientField === 'cc' && showSuggestions && contactSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '0',
                        right: '0',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        zIndex: 50,
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {contactSuggestions.map((contact, idx) => (
                          <div
                            key={idx}
                            onClick={() => selectContact(contact)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: idx < contactSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                          >
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                              {contact.first_name} {contact.last_name}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {contact.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={styles.formGroup} style={{ position: 'relative' }}>
                    <label>Bcc</label>
                    <input
                      type="text"
                      value={composeForm.bcc}
                      onChange={(e) => handleRecipientChange('bcc', e.target.value)}
                      onFocus={() => { setActiveRecipientField('bcc'); if (composeForm.bcc && composeForm.bcc.length > 1) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Bcc"
                      autoComplete="off"
                    />

                    {/* Suggestions Dropdown Bcc */}
                    {activeRecipientField === 'bcc' && showSuggestions && contactSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '0',
                        right: '0',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        zIndex: 50,
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {contactSuggestions.map((contact, idx) => (
                          <div
                            key={idx}
                            onClick={() => selectContact(contact)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: idx < contactSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                          >
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                              {contact.first_name} {contact.last_name}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {contact.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Subject */}
              {/* Subject */}
              <div className={styles.formGroup}>
                <label>Subject</label>
                <input
                  type="text"
                  placeholder="Subject"
                  value={composeForm.subject}
                  onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })}
                  style={{ fontWeight: 500 }}
                />
              </div>

              {/* ReactQuill Editor */}
              <div className={styles.editorContainer}>
                <ReactQuill
                  theme="snow"
                  value={composeForm.body}
                  onChange={(value: string) => setComposeForm({ ...composeForm, body: value })}
                  placeholder="Write your message..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                      [{ 'font': ['', 'arial', 'verdana', 'times-new-roman', 'georgia', 'courier-new', 'trebuchet-ms', 'plus-jakarta-sans'] }],
                      [{ 'size': [] }],
                      ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
                      [{ 'script': 'sub' }, { 'script': 'super' }],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                      [{ 'direction': 'rtl' }],
                      [{ 'align': [] }],
                      ['link', 'image', 'video', 'clean']
                    ],
                  }}
                />
              </div>

              {/* Action Buttons */}
              {/* Attachments Display */}
              {composeForm.attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', marginTop: '16px' }}>
                  {composeForm.attachments.map((file, index) => (
                    <div key={index} className={styles.attachmentChip}>
                      <i className="fa-light fa-paperclip" style={{ color: '#5f6368' }}></i>
                      <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className={styles.attachmentRemove}
                      >
                        <i className="fa-solid fa-times-circle"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className={styles.formActions} style={{ marginTop: 'auto' }}>
                <label className={styles.secondaryBtn} title="Attach File" style={{ marginRight: 'auto' }}>
                  <span style={{ fontSize: '15px' }}>Attach</span>
                  <input type="file" multiple onChange={handleAttachmentChange} style={{ display: 'none' }} />
                </label>

                <button
                  onClick={() => {
                    setIsComposeOpen(false);
                    setShowCcBcc(false);
                  }}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDraft}
                  className={styles.cancelBtn}
                  disabled={isSending}
                >
                  {isSending ? 'Saving...' : 'Draft'}
                </button>
                <button
                  onClick={handleSendEmail}
                  className={styles.saveBtn}
                  disabled={isSending}
                >
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Settings Modal */}

    </div>
  );
};

export default EmailsPage;
