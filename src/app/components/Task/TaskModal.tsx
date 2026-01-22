'use client';

import { useState, useEffect } from 'react';
import styles from './taskmodal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

interface TaskModalProps {
  companyId?: string;
  contactId?: string;
  onSuccess: () => void;
  onClose: () => void;
  isOpen: boolean;
  task?: any; // Enable editing existing tasks
}

export default function TaskModal({ companyId, contactId, onSuccess, onClose, isOpen, task = null }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'hold' | 'drop' | 'completed'>('pending');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [recurringUntil, setRecurringUntil] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [markAsCompleted, setMarkAsCompleted] = useState(false);
  const [markAsHighPriority, setMarkAsHighPriority] = useState(false);
  const [totalAmount, setTotalAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isChildTask, setIsChildTask] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setIsChildTask(!!task.parent_task_id);

        let desc = task.description || '';
        let amt = task.total_amount ? task.total_amount.toString() : '';

        // Extract tags
        const critMatch = desc.match(/\[Critical\]/);
        let isCrit = false;
        if (critMatch) {
          isCrit = true;
          desc = desc.replace(critMatch[0], '').trim();
        }

        const amtMatch = desc.match(/\[Amount:\s*(\d+(\.\d+)?)\]/);
        if (amtMatch) {
          amt = amtMatch[1];
          desc = desc.replace(amtMatch[0], '').trim();
        }

        setTitle(task.title || '');
        setDescription(desc);
        setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
        setStatus(task.status || 'pending');
        setIsRecurring(task.is_recurring || false);
        setRecurrencePattern(task.recurrence_pattern || 'weekly');
        setRecurringUntil(task.recurring_until ? task.recurring_until.split('T')[0] : '');
        setPriority(task.priority || 'medium');
        setMarkAsCompleted(task.mark_as_completed || false);
        setMarkAsHighPriority(isCrit);
        setTotalAmount(amt);
      } else {
        resetForm();
      }
    }
  }, [isOpen, task]);

  // Auto-suggest recurring_until
  useEffect(() => {
    if (isRecurring && dueDate && !recurringUntil) {
      const start = new Date(dueDate);
      let suggestedEnd = new Date(start);
      switch (recurrencePattern) {
        case 'daily': suggestedEnd.setDate(suggestedEnd.getDate() + 7); break;
        case 'weekly': suggestedEnd.setDate(suggestedEnd.getDate() + 28); break;
        case 'monthly': suggestedEnd.setMonth(suggestedEnd.getMonth() + 6); break;
        case 'yearly': suggestedEnd.setFullYear(suggestedEnd.getFullYear() + 1); break;
      }
      setRecurringUntil(suggestedEnd.toISOString().split('T')[0]);
    }
  }, [isRecurring, recurrencePattern, dueDate, recurringUntil]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (isRecurring && dueDate && recurringUntil) {
      if (new Date(recurringUntil) <= new Date(dueDate)) {
        setError('Recurring "Until When" date must be AFTER the Due Date');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      let baseDesc = description
        .replace(/\[Amount:\s*(\d+(\.\d+)?)\]/g, '')
        .replace(/\[Critical\]/g, '')
        .trim();

      if (totalAmount) baseDesc += ` [Amount: ${totalAmount}]`;
      if (markAsHighPriority) baseDesc += ` [Critical]`;

      const packedDescription = baseDesc;

      const bodyData = {
        title,
        description: packedDescription,
        due_date: dueDate || null,
        status,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        recurring_until: isRecurring && recurringUntil ? recurringUntil : null,
        priority,
        mark_as_completed: markAsCompleted,
        mark_as_high_priority: markAsHighPriority,
        total_amount: null,
        companyId: companyId || null,
        contactId: contactId || null,
        related_to: companyId ? 'company' : contactId ? 'contact' : null
      };

      // Determine URL
      let url = '';
      let method = task ? 'PUT' : 'POST';

      if (companyId) {
        url = task ? `/api/companies/tasks/${task.id}` : '/api/companies/tasks';
      } else if (contactId) {
        url = task ? `/api/contacts/tasks/${task.id}` : '/api/contacts/tasks';
      } else {
        throw new Error('Context missing');
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      if (result.message && !task) alert(result.message);

      onSuccess();
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setStatus('pending');
    setIsRecurring(false);
    setRecurrencePattern('weekly');
    setRecurringUntil('');
    setPriority('medium');
    setMarkAsCompleted(false);
    setMarkAsHighPriority(false);
    setTotalAmount('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{task ? 'Edit Task' : 'Add New Task'}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-sharp fa-thin fa-xmark"></i>          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label>Task Title *</label>
              <input
                type="text"
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label>Description</label>
              <textarea
                placeholder="Task description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="hold">Hold</option>
                <option value="drop">Drop</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.checkboxContainer} style={{ marginTop: '28px' }}>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  disabled={isChildTask}
                />
                <span className={styles.formLabel}>Recurring Task</span>
                {isChildTask && <small style={{ color: '#f57c00', marginLeft: '5px' }}>(Series item)</small>}
              </div>
            </div>

            <div className={styles.formGroup}>
              {isRecurring && (
                <>
                  <label>Recurrence Pattern</label>
                  <select
                    value={recurrencePattern}
                    onChange={(e) => setRecurrencePattern(e.target.value as any)}
                    disabled={isChildTask}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </>
              )}
            </div>

            {isRecurring && (
              <div className={styles.formGroup}>
                <label>Until (after Due Date)</label>
                <input
                  type="date"
                  value={recurringUntil}
                  onChange={(e) => setRecurringUntil(e.target.value)}
                  min={dueDate || undefined}
                  disabled={isChildTask}
                />
              </div>
            )}

            {/* Spacer if recurring is active but only 2 items in row above, actually grid handles it flow. */}

            <div className={styles.formGroup}>
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Total Amount</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className={`${styles.formGroup} ${styles.formGroupFull}`} style={{ flexDirection: 'row', gap: '20px' }}>
              <div className={styles.checkboxContainer}>
                <input
                  type="checkbox"
                  checked={markAsCompleted}
                  onChange={(e) => setMarkAsCompleted(e.target.checked)}
                />
                <span className={styles.formLabel}>Mark as Completed</span>
              </div>
              <div className={styles.checkboxContainer}>
                <input
                  type="checkbox"
                  checked={markAsHighPriority}
                  onChange={(e) => setMarkAsHighPriority(e.target.checked)}
                />
                <span className={styles.formLabel}>Mark as Critical</span>
              </div>
            </div>

            {error && <div className={`${styles.error} ${styles.formGroupFull}`}>{error}</div>}
          </div>

          <div className={styles.formActions}>
            <button onClick={onClose} className={styles.cancelButton} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              className={styles.submitButton}
            >
              {isSubmitting ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}