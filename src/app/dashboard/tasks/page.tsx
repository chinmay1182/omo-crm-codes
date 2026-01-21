"use client";

import { useState, useEffect } from "react";
import MainTaskModal from "@/app/components/MainTaskModal/MainTaskModal";
import styles from "./styles.module.css";
import Skeleton from "@/app/components/ui/Skeleton";
import Image from "next/image";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "hold" | "drop" | "completed";
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurring_until: string | null;
  related_to: "contact" | "company";
  priority: "low" | "medium" | "high";
  mark_as_completed: boolean;
  mark_as_high_priority: boolean;
  total_amount: number | null;
  company_id: string | null;
  company_name: string | null;
  assigned_to: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  created_at: string;
  parent_task_id: string | null;
  instance_number: number | null;
}

interface Company {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company_id: string | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all tasks
        const tasksResponse = await fetch("/api/companies/tasks/all");
        if (!tasksResponse.ok) throw new Error("Failed to fetch tasks");
        const tasksData = await tasksResponse.json();
        setTasks(tasksData);

        // Fetch companies for modal
        const companiesResponse = await fetch("/api/companies");
        if (!companiesResponse.ok) throw new Error("Failed to fetch companies");
        const companiesData = await companiesResponse.json();
        setCompanies(companiesData);

        // Fetch contacts for modal
        const contactsResponse = await fetch("/api/contacts");
        if (!contactsResponse.ok) throw new Error("Failed to fetch contacts");
        const contactsData = await contactsResponse.json();
        setContacts(contactsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTaskCreated = async () => {
    try {
      const response = await fetch("/api/companies/tasks/all");
      if (!response.ok) throw new Error("Failed to refresh tasks");
      const data = await response.json();
      setTasks(data);
      setEditingTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh tasks");
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/companies/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete task");

      // Refresh tasks
      handleTaskCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#ff6b6b";
      case "medium":
        return "#ffd166";
      case "low":
        return "#06d6a0";
      default:
        return "#e0e0e0";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      !selectedStatus || task.status === selectedStatus;
    const matchesSearch =
      searchQuery === "" ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description &&
        task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.company_name &&
        task.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.contact_first_name &&
        task.contact_first_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (task.contact_last_name &&
        task.contact_last_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    // Date range filter - using due_date instead of created_at
    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      if (!task.due_date) {
        matchesDate = false; // Tasks without due_date won't match date filter
      } else {
        const taskDate = new Date(task.due_date);
        taskDate.setHours(0, 0, 0, 0);

        const start = dateRange.start ? new Date(dateRange.start) : null;
        if (start) start.setHours(0, 0, 0, 0);

        const end = dateRange.end ? new Date(dateRange.end) : null;
        if (end) end.setHours(23, 59, 59, 999);

        if (start && taskDate < start) matchesDate = false;
        if (end && taskDate > end) matchesDate = false;
      }
    }

    return matchesStatus && matchesSearch && matchesDate;
  });

  // Helper function to format date as DD/MM/YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Skeleton width={200} height={32} style={{ marginBottom: '8px' }} />
            <Skeleton width={400} height={20} />
          </div>
        </div>

        {/* Mock Filters */}
        <div className={styles.filters} style={{ marginBottom: '24px' }}>
          <Skeleton width={300} height={38} />
          <Skeleton width={200} height={38} />
          <Skeleton width={150} height={38} />
        </div>

        <div className={styles.taskGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.taskCard} style={{ borderLeft: '4px solid #e0e0e0' }}>
              <div className={styles.taskHeader} style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width={180} height={24} />
                <Skeleton width={60} height={20} />
              </div>
              <Skeleton width="90%" height={16} style={{ marginBottom: '4px' }} />
              <Skeleton width="60%" height={16} style={{ marginBottom: '16px' }} />
              <div className={styles.taskMeta} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <Skeleton width={80} height={16} />
                <Skeleton width={100} height={16} />
                <Skeleton width={120} height={16} />
              </div>
              <div className={styles.taskFooter} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className={styles.taskBadges} style={{ display: 'flex', gap: '4px' }}>
                  <Skeleton width={80} height={24} style={{ borderRadius: '12px' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Skeleton width={60} height={32} />
                  <Skeleton width={60} height={32} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      {/* Top Navigation Bar */}
      <div className={styles.topNav}>
        <div className={styles.navTabsContainer}>
          <button className={`${styles.navTab} ${styles.active}`}>
            All Tasks
          </button>
        </div>

        {/* Search with Icon - Left side */}
        <div className={styles.searchWrapper}>
          <i className={`fa-sharp fa-thin fa-search ${styles.searchIcon}`}></i>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.topActions}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className={styles.dateInput}
              style={{ width: '130px' }}
            />
            <span style={{ color: '#ccc' }}>-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className={styles.dateInput}
              style={{ width: '130px' }}
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="hold">Hold</option>
            <option value="drop">Drop</option>
          </select>
        </div>
      </div>

      <div className={styles.contentArea}>
        {loading ? (
          <div className={styles.taskGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={styles.taskCard}>
                <Skeleton width={180} height={24} style={{ marginBottom: '10px' }} />
                <Skeleton width="100%" height={16} />
                <Skeleton width="100%" height={16} style={{ marginTop: '4px' }} />
                <Skeleton width="80%" height={16} style={{ marginTop: '4px' }} />
              </div>
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className={styles.taskGrid}>
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`${styles.taskCard} ${styles[task.status]}`}
              >
                <div className={styles.taskHeader}>
                  <h3 className={styles.taskTitle}>{task.title}</h3>
                  <span className={styles.taskPriority}>{task.priority}</span>
                </div>

                {(() => {
                  let displayDesc = task.description || '';
                  let displayAmount = task.total_amount ? Number(task.total_amount) : null;

                  const critMatch = displayDesc.match(/\[Critical\]/);
                  if (critMatch) {
                    displayDesc = displayDesc.replace(critMatch[0], '').trim();
                  }

                  const amtMatch = displayDesc.match(/\[Amount:\s*(\d+(\.\d+)?)\]/);
                  if (amtMatch) {
                    if (displayAmount === null) displayAmount = Number(amtMatch[1]);
                    displayDesc = displayDesc.replace(amtMatch[0], '').trim();
                  }

                  return (
                    <>
                      {displayDesc && (
                        <p className={styles.taskDescription}>{displayDesc}</p>
                      )}

                      <div className={styles.taskMeta}>
                        {task.due_date && (
                          <span>
                            <strong>Due:</strong>{" "}
                            {formatDate(task.due_date)}
                          </span>
                        )}

                        {task.company_name && (
                          <span>
                            <strong>Company:</strong> {task.company_name}
                          </span>
                        )}

                        {(task.contact_first_name || task.contact_last_name) && (
                          <span>
                            <strong>Contact:</strong> {task.contact_first_name}{" "}
                            {task.contact_last_name}
                          </span>
                        )}

                        {displayAmount !== null && !isNaN(displayAmount) && (
                          <span>
                            <strong>Amount:</strong> ₹
                            {displayAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}

                <div className={styles.taskFooter}>
                  <div className={styles.taskBadges}>
                    <span
                      className={`${styles.statusBadge} ${styles[task.status]}`}
                    >
                      {task.status.replace("_", " ")}
                    </span>

                    {task.is_recurring && task.recurrence_pattern && (
                      <span className={styles.recurringBadge}>
                        {task.recurrence_pattern}
                        {task.instance_number && ` #${task.instance_number}`}
                        {task.recurring_until &&
                          ` until ${formatDate(task.recurring_until)}`}
                      </span>
                    )}

                    {task.mark_as_completed && (
                      <span className={styles.completedBadge}>Completed</span>
                    )}

                    {task.description && task.description.includes('[Critical]') && (
                      <span className={styles.highPriorityBadge}>
                        Critical
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEditTask(task)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateImage}>
              <Image
                src="/pngegg.png"
                alt="No Tasks"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
            <p className={styles.emptyTitle}>No tasks available</p>
            <p className={styles.emptySubtitle}>Click the + button to create your first task!</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className={styles.fab}
              title="Add New Task"
              style={{ position: 'static', marginTop: '1rem', width: '56px', height: '56px' }}
            >
              <i className="fa-light fa-plus"></i>
            </button>
          </div>
        )}
      </div>

      {/* Global FAB - Always visible if tasks exist, or handle logic to hide if empty state handles it */}
      {filteredTasks.length > 0 && !loading && (
        <button
          onClick={() => setIsModalOpen(true)}
          className={styles.fab}
          title="Add New Task"
        >
          <i className="fa-light fa-plus"></i>
        </button>
      )}

      {isModalOpen && (
        <MainTaskModal
          companyId=""
          onSuccess={handleTaskCreated}
          onClose={handleCloseModal}
          isOpen={isModalOpen}
          companies={companies}
          contacts={contacts}
          task={editingTask}
        />
      )}
    </div>
  );
}
