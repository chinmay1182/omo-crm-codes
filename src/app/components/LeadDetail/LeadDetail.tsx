'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './LeadDetail.module.css';

interface LeadDetailProps {
  lead: {
    id: string;
    assignment_name: string;
    contact_name?: string;
    company_name?: string;
    stage: string;
    service?: string;
    amount?: number;
    closing_date?: string;
    source?: string;
    priority: string;
    description?: string;
    created_at: string;
    updated_at: string;
  };
}

interface Comment {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
}

export default function LeadDetail({ lead }: LeadDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Comment functionality
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [lead.id]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      });

      if (res.ok) {
        const savedComment = await res.json();
        setComments([savedComment, ...comments]);
        setNewComment('');
      } else {
        alert('Failed to add comment');
      }
    } catch (err) {
      console.error('Error adding comment', err);
      alert('Error adding comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this lead?')) {
      setLoading(true);
      try {
        const response = await fetch(`/api/leads/${lead.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete lead');
        }

        router.push('/dashboard/lead-management');
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
            <html>
            <head>
                <title>Lead Details - ${lead.assignment_name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                    h1 { color: #15426d; border-bottom: 2px solid #15426d; padding-bottom: 10px; margin-bottom: 20px; }
                    .detail-row { display: flex; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
                    .label { font-weight: bold; width: 180px; color: #555; }
                    .value { flex: 1; }
                    .section { margin-top: 30px; }
                    .section-title { font-size: 18px; color: #15426d; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                    .description { background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #eee; }
                </style>
            </head>
            <body>
                <h1>Lead Details</h1>
                
                <div class="detail-row"><span class="label">Assignment Name:</span><span class="value">${lead.assignment_name}</span></div>
                <div class="detail-row"><span class="label">Contact:</span><span class="value">${lead.contact_name || '-'}</span></div>
                <div class="detail-row"><span class="label">Company:</span><span class="value">${lead.company_name || '-'}</span></div>
                <div class="detail-row"><span class="label">Stage:</span><span class="value">${lead.stage}</span></div>
                <div class="detail-row"><span class="label">Priority:</span><span class="value">${lead.priority}</span></div>
                <div class="detail-row"><span class="label">Service:</span><span class="value">${lead.service || '-'}</span></div>
                <div class="detail-row"><span class="label">Amount:</span><span class="value">${lead.amount ? '₹' + lead.amount.toLocaleString('en-IN') : '-'}</span></div>
                <div class="detail-row"><span class="label">Follow-up Date:</span><span class="value">${lead.closing_date ? new Date(lead.closing_date).toLocaleDateString() : '-'}</span></div>
                <div class="detail-row"><span class="label">Source:</span><span class="value">${lead.source || '-'}</span></div>
                <div class="detail-row"><span class="label">Created At:</span><span class="value">${lead.created_at ? new Date(lead.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</span></div>
                <div class="detail-row"><span class="label">Last Updated:</span><span class="value">${lead.updated_at ? new Date(lead.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</span></div>

                ${lead.description ? `
                    <div class="section">
                        <div class="section-title">Description</div>
                        <div class="description">${lead.description}</div>
                    </div>
                ` : ''}

                ${comments && comments.length > 0 ? `
                    <div class="section">
                        <div class="section-title">Comments History</div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${comments.map((comment: Comment) => `
                                <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0;">
                                    <div style="font-size: 11px; color: #888; margin-bottom: 4px; display: flex; justify-content: space-between;">
                                        <span>System</span> 
                                        <span>${new Date(comment.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                                    </div>
                                    <div style="font-size: 13px; color: #333;">${comment.content}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div style="margin-top: 40px; text-align: center; color: #888; font-size: 12px;">
                    Generated from ConsoLegal CRM on ${new Date().toLocaleString()}
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
      printWindow.document.close();
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'High': return styles.highPriority;
      case 'Medium': return styles.mediumPriority;
      case 'Low': return styles.lowPriority;
      default: return '';
    }
  };

  const getStageClass = (stage: string) => {
    switch (stage) {
      case 'New': return styles.stageNew;
      case 'Qualify': return styles.stageQualify;
      case 'Proposal': return styles.stageProposal;
      case 'Review': return styles.stageReview;
      case 'WON': return styles.stageWON;
      case 'DROP': return styles.stageDROP;
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => router.push('/dashboard/lead-management')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              color: '#15426d',
              padding: '5px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Back to Leads"
          >
            <i className="fa-light fa-arrow-left"></i>
          </button>
          <h1>Lead Details</h1>
        </div>
        <div className={styles.actions}>
          <button
            onClick={handlePrint}
            className={styles.editButton}
            style={{ backgroundColor: '#6c757d', marginRight: '10px', color: 'white' }}
          >
            <i className="fa-light fa-print" style={{ marginRight: '5px' }}></i>
            Print
          </button>
          <Link href={`/dashboard/lead-management/${lead.id}/edit`} className={styles.editButton}>
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={loading}
            className={styles.deleteButton}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.detailCard}>
        <div className={styles.detailRow}>
          <span className={styles.label}>Assignment Name:</span>
          <span className={styles.value}>{lead.assignment_name}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.label}>Contact:</span>
          <span className={styles.value}>{lead.contact_name || '-'}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.label}>Company:</span>
          <span className={styles.value}>{lead.company_name || '-'}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.label}>Stage:</span>
          <span className={`${styles.value} ${styles.stage} ${getStageClass(lead.stage)}`}>
            {lead.stage}
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.label}>Priority:</span>
          <span className={`${styles.value} ${styles.priority} ${getPriorityClass(lead.priority)}`}>
            {lead.priority}
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.label}>Service:</span>
          <span className={styles.value}>{lead.service || '-'}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.label}>Amount:</span>
          <span className={styles.value}>
            {lead.amount ? `₹${lead.amount.toLocaleString('en-IN')}` : '-'}
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.label}>Follow-up Date:</span>
          <span className={styles.value}>
            {lead.closing_date ? new Date(lead.closing_date).toLocaleDateString() : '-'}
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.label}>Source:</span>
          <span className={styles.value}>{lead.source || '-'}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.label}>Created At:</span>
          <span className={styles.value}>
            {lead.created_at ? new Date(lead.created_at).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata'
            }) : 'N/A'}
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.label}>Last Updated:</span>
          <span className={styles.value}>
            {lead.updated_at ? new Date(lead.updated_at).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata'
            }) : 'N/A'}
          </span>
        </div>

        {lead.description && (
          <div className={styles.detailSection}>
            <h3 className={styles.sectionTitle}>Description</h3>
            <p className={styles.description}>{lead.description}</p>
          </div>
        )}
      </div>

      <div className={styles.detailCard} style={{ marginTop: '20px' }}>
        <h3 className={styles.sectionTitle}>Comment History</h3>

        <div style={{ marginBottom: '20px' }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a follow-up comment..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleAddComment}
            disabled={commentLoading || !newComment.trim()}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: '#15426d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: commentLoading || !newComment.trim() ? 'not-allowed' : 'pointer',
              opacity: commentLoading || !newComment.trim() ? 0.7 : 1
            }}
          >
            {commentLoading ? 'Adding...' : 'Add Comment'}
          </button>
        </div>

        <div className={styles.commentsList}>
          {comments.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} style={{
                padding: '12px',
                borderBottom: '1px solid #eee',
                marginBottom: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  <span style={{ fontWeight: 600 }}>
                    {new Date(comment.created_at).toLocaleString('en-IN', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: '#333' }}>
                  {comment.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}