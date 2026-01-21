'use client';

import { useState, useEffect } from 'react';
import styles from './tasklist.module.css';
import toast from 'react-hot-toast';
import Skeleton from '../ui/Skeleton';

interface CompanyTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'hold' | 'drop';
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurring_until: string | null;
  related_to: 'contact' | 'company';
  priority: 'low' | 'medium' | 'high';
  mark_as_completed: boolean;
  mark_as_high_priority: boolean;
  total_amount: number | null;
  created_at: string;
}

interface TaskListProps {
  companyId?: string;
  contactId?: string;
}

export default function TaskList({ companyId, contactId }: TaskListProps) {
  const [tasks, setTasks] = useState<CompanyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        let url = '';

        if (companyId) {
          url = `/api/companies/tasks?companyId=${companyId}`;
        } else if (contactId) {
          url = `/api/contacts/tasks?contactId=${contactId}`;
        } else {
          throw new Error('Either companyId or contactId is required');
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }

        const data = await response.json();
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    if (companyId || contactId) {
      fetchTasks();
    }
  }, [companyId, contactId]);



  const handleStatusChange = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'hold' | 'drop') => {
    const toastId = toast.loading('Updating status...');

    try {
      let url = '';
      if (companyId) {
        url = `/api/companies/tasks/${taskId}`;
      } else if (contactId) {
        url = `/api/contacts/tasks/${taskId}`;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      // First check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || 'Invalid response from server');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      // Update local state
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      toast.success('Status updated!', { id: toastId });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      toast.error(errorMessage, { id: toastId });
      console.error('Update error:', err);
    }
  };




  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      let url = '';
      if (companyId) {
        url = `/api/companies/tasks/${taskId}`;
      } else if (contactId) {
        url = `/api/contacts/tasks/${taskId}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffd166';
      case 'low': return '#06d6a0';
      default: return '#e0e0e0';
    }
  };

  if (loading) {
    return (
      <div className={styles.taskListContainer}>
        <ul className={styles.taskList}>
          {[1, 2, 3].map((i) => (
            <li key={i} className={styles.taskItem} style={{ borderLeft: '4px solid #e0e0e0', display: 'flex', justifyContent: 'space-between' }}>
              <div className={styles.taskInfo} style={{ width: '100%' }}>
                <div className={styles.taskHeader} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                  <Skeleton width={150} height={24} />
                  <Skeleton width={60} height={20} style={{ marginLeft: '10px' }} />
                </div>
                <Skeleton width="90%" height={16} style={{ marginBottom: '4px' }} />
                <Skeleton width="40%" height={16} />
              </div>
              <div className={styles.taskActions} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Skeleton width={100} height={36} />
                <Skeleton width={80} height={36} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.taskListContainer}>
      {tasks.length === 0 ? (
        <p className={styles.noTasks}>No tasks added yet.</p>
      ) : (
        <ul className={styles.taskList}>
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`${styles.taskItem} ${styles[task.status]}`}
              style={{ borderLeft: `4px solid ${getPriorityColor(task.priority)}` }}
            >
              <div className={styles.taskInfo}>
                <div className={styles.taskHeader}>
                  <h4 className={styles.taskTitle}>{task.title}</h4>
                  <span className={styles.taskPriority}>{task.priority}</span>
                  {task.is_recurring && (
                    <span className={styles.recurringBadge}>
                      {task.recurrence_pattern}
                    </span>
                  )}
                </div>

                {(() => {
                  // Extract Tags from description for display
                  let displayDesc = task.description || '';
                  let displayAmount = task.total_amount ? Number(task.total_amount) : null;

                  // 1. Critical Tag
                  const critMatch = displayDesc.match(/\[Critical\]/);
                  if (critMatch) {
                    displayDesc = displayDesc.replace(critMatch[0], '').trim();
                  }

                  // 2. Amount Tag
                  const amtMatch = displayDesc.match(/\[Amount:\s*(\d+(\.\d+)?)\]/);
                  if (amtMatch) {
                    if (displayAmount === null) displayAmount = Number(amtMatch[1]);
                    displayDesc = displayDesc.replace(amtMatch[0], '').trim();
                  }

                  // 3. Related Tag
                  let displayRelated: string | undefined = task.related_to;
                  const relMatch = displayDesc.match(/\[Related:\s*(.*?)\]/);
                  if (relMatch) {
                    if (!displayRelated) displayRelated = relMatch[1];
                    displayDesc = displayDesc.replace(relMatch[0], '').trim();
                  }

                  return (
                    <>
                      {displayDesc && (
                        <p className={styles.taskDescription}>{displayDesc}</p>
                      )}

                      <div className={styles.taskMeta}>
                        {task.due_date && (
                          <span>
                            <strong>Due:</strong> {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {displayRelated && (
                          <span>
                            <strong>Related:</strong> {displayRelated}
                          </span>
                        )}
                        {displayAmount !== null && !isNaN(displayAmount) && (
                          <span>
                            <strong>Amount:</strong> ₹{displayAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className={styles.taskActions}>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(
                    task.id,
                    e.target.value as 'pending' | 'in_progress' | 'hold' | 'drop'
                  )}
                  className={styles.statusSelect}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="hold">Hold</option>
                  <option value="drop">Drop</option>
                </select>

                <div className={styles.markAsCheckboxes}>
                  {task.mark_as_completed && (
                    <span className={styles.markBadge}>Completed</span>
                  )}
                  {task.description && task.description.includes('[Critical]') && (
                    <span className={styles.priorityBadge}>Critical</span>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(task.id)}
                  className={styles.deleteButtonTwo}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}