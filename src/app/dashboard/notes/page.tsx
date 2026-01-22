"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./styles.module.css";
import { useAuth } from "@/app/context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faEdit,
  faSave,
  faTimes,
  faStar,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";

interface Note {
  id: string;
  title: string | null;
  content: string;
  is_starred: boolean;
  is_completed: boolean;
  company_id: string | null;
  contact_id: string | null;
  related_to: "company" | "contact" | "none";
  company_name: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  created_at: string;
  user_id: string;
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

const NotesPage = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "starred" | "completed">(
    "all"
  );

  // Form states
  const [newNote, setNewNote] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [relatedTo, setRelatedTo] = useState<"company" | "contact" | "none">(
    "none"
  );
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedContact, setSelectedContact] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");

  // Edit states
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Date filter state
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredNotes = notes.filter((note) => {
    if (!dateRange.start && !dateRange.end) return true;
    const noteDate = new Date(note.created_at);
    noteDate.setHours(0, 0, 0, 0);

    const start = dateRange.start ? new Date(dateRange.start) : null;
    if (start) start.setHours(0, 0, 0, 0);

    const end = dateRange.end ? new Date(dateRange.end) : null;
    if (end) end.setHours(23, 59, 59, 999);

    if (start && noteDate < start) return false;
    if (end && noteDate > end) return false;
    return true;
  });

  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchCompanies();
      fetchContacts();
    }
  }, [user]);

  useEffect(() => {
    fetchNotes();
  }, [activeTab]);

  // Removed the auto-opening modal effect
  // useEffect(() => {
  //   if (notes.length === 0 && !isLoading) {
  //     setShowAddModal(true);
  //   }
  // }, [notes, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setShowAddModal(false);
      }
    };

    if (showAddModal) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showAddModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAddModal(false);
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        if (editingNoteId) {
          handleUpdateNote(editingNoteId);
        } else if (newNote.trim() && showAddModal) {
          handleAddNote();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [newNote, editingNoteId, editedContent, showAddModal]);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const filter = activeTab === "all" ? "active" : activeTab;
      const response = await fetch(`/api/notes?filter=${filter}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please log in to perform this action");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to fetch notes");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/companies");
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/contacts");
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: newTitle || null,
          content: newNote,
          company_id: relatedTo === "company" ? selectedCompany || null : null,
          contact_id: relatedTo === "contact" ? selectedContact || null : null,
          related_to: relatedTo,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please log in to add notes");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNotes([data.note, ...notes]);
      resetForm();
      setShowAddModal(false);
      toast.success("Note added successfully");
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewNote("");
    setNewTitle("");
    setRelatedTo("none");
    setSelectedCompany("");
    setSelectedContact("");
    setCompanySearch("");
    setContactSearch("");
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditedContent(note.content);
    setEditedTitle(note.title || "");
  };

  const handleToggleStar = async (noteId: string, currentStarred: boolean) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_starred: !currentStarred }),
      });

      if (response.ok) {
        setNotes(
          notes.map((note) =>
            note.id === noteId ? { ...note, is_starred: !currentStarred } : note
          )
        );
        toast.success(
          currentStarred ? "Removed from starred" : "Added to starred"
        );
      }
    } catch (error) {
      toast.error("Failed to update star status");
    }
  };

  const handleToggleComplete = async (
    noteId: string,
    currentCompleted: boolean
  ) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_completed: !currentCompleted }),
      });

      if (response.ok) {
        setNotes(
          notes.map((note) =>
            note.id === noteId
              ? { ...note, is_completed: !currentCompleted }
              : note
          )
        );
        toast.success(
          currentCompleted ? "Marked as incomplete" : "Marked as completed"
        );
      }
    } catch (error) {
      toast.error("Failed to update completion status");
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editedContent.trim()) return;
    setIsSaving(true);

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: editedTitle || null,
          content: editedContent,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please log in to update notes");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNotes(
        notes.map((note) =>
          note.id === noteId
            ? { ...note, title: editedTitle || null, content: editedContent }
            : note
        )
      );
      setEditingNoteId(null);
      toast.success("Note updated successfully");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please log in to delete notes");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNotes(notes.filter((note) => note.id !== noteId));
      toast.success("Note deleted successfully");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
      </div>
    );
  }

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredContacts = contacts.filter((contact) =>
    `${contact.first_name} ${contact.last_name}`
      .toLowerCase()
      .includes(contactSearch.toLowerCase())
  );

  return (
    <div className={styles.notesContainer}>
      <div className={styles.topNav}>
        <div className={styles.navTabsContainer}>
          <button
            className={`${styles.navTab} ${activeTab === "all" ? styles.active : ""
              }`}
            onClick={() => setActiveTab("all")}
          >
            All Notes
          </button>
          <button
            className={`${styles.navTab} ${activeTab === "starred" ? styles.active : ""
              }`}
            onClick={() => setActiveTab("starred")}
          >
            Starred
          </button>
          <button
            className={`${styles.navTab} ${activeTab === "completed" ? styles.active : ""
              }`}
            onClick={() => setActiveTab("completed")}
          >
            Completed
          </button>
        </div>

        <div className={styles.topActions}>
          <div className={styles.dateFilters}>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className={styles.dateInput}
            />
            <span style={{ color: '#666', fontSize: '13px' }}>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className={styles.dateInput}
            />
          </div>
        </div>
      </div>

      <div className={styles.contentArea}>
        <div className={styles.notesList}>
          {filteredNotes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateImage}>
                <Image
                  src="/pngegg.png"
                  alt="No Notes"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <p className={styles.emptyTitle}>No notes available</p>
              <p className={styles.emptySubtitle}>Click the + button to add your first note!</p>
              <button
                onClick={() => setShowAddModal(true)}
                className={styles.fab}
                title="Add new note"
              >
                <i className="fa-light fa-plus"></i>
              </button>
            </div>
          ) : (
            <>
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className={`${styles.noteCard} ${note.is_completed ? styles.completedNote : ""
                    }`}
                >
                  {editingNoteId === note.id ? (
                    <div className={styles.editContainer}>
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        placeholder="Note title (optional)"
                        className={styles.titleInput}
                      />
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className={styles.editTextarea}
                        maxLength={1000}
                      />
                      <div className={styles.counter}>
                        {editedContent.length}/1000
                      </div>
                      <div className={styles.editActions}>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className={styles.cancelButton}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateNote(note.id)}
                          className={styles.saveButton}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <span className={styles.spinner}></span> Saving...
                            </>
                          ) : (
                            <>
                              Save
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.noteHeader}>
                        {note.title && (
                          <h3
                            className={`${styles.noteTitle} ${note.is_completed ? styles.strikethrough : ""
                              }`}
                          >
                            {note.title}
                          </h3>
                        )}
                        <div className={styles.noteHeaderActions}>
                          <button
                            onClick={() =>
                              handleToggleStar(note.id, note.is_starred)
                            }
                            className={`${styles.starButton} ${note.is_starred ? styles.starred : ""
                              }`}
                            title={
                              note.is_starred
                                ? "Remove from starred"
                                : "Add to starred"
                            }
                          >
                            <FontAwesomeIcon icon={faStar} />
                          </button>
                          <label className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={note.is_completed}
                              onChange={() =>
                                handleToggleComplete(note.id, note.is_completed)
                              }
                              className={styles.completedCheckbox}
                            />
                            <span className={styles.checkboxText}>
                              Mark as completed
                            </span>
                          </label>
                        </div>
                      </div>

                      <div
                        className={`${styles.noteContent} ${note.is_completed ? styles.strikethrough : ""
                          }`}
                      >
                        {note.content}
                      </div>

                      {(note.company_name || note.contact_first_name) && (
                        <div className={styles.noteRelation}>
                          {note.company_name && (
                            <span className={styles.relationTag}>
                              Company: {note.company_name}
                            </span>
                          )}
                          {note.contact_first_name && (
                            <span className={styles.relationTag}>
                              Contact: {note.contact_first_name}{" "}
                              {note.contact_last_name}
                            </span>
                          )}
                        </div>
                      )}

                      <div className={styles.noteMeta}>
                        {new Date(note.created_at).toLocaleString()}
                      </div>

                      <div className={styles.noteActions}>
                        <button
                          onClick={() => handleEditNote(note)}
                          className={styles.editButton}
                          title="Edit note"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className={styles.deleteButton}
                          title="Delete note"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={() => setShowAddModal(true)}
                className={styles.fab}
                title="Add new note"
              >
                <i className="fa-light fa-plus"></i>
              </button>
            </>
          )}
        </div>
      </div>

      {
        showAddModal && (
          <div className={styles.modalOverlay}>
            <div ref={modalRef} className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>Add New Note</h2>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className={styles.closeButton}
                >
                  <i className="fa-sharp fa-thin fa-xmark"></i>
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Note title (optional)"
                    className={styles.titleInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <textarea
                    ref={textareaRef}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Type your note here..."
                    className={styles.noteTextarea}
                    maxLength={1000}
                    autoFocus
                  />
                  <div className={styles.counter}>{newNote.length}/1000</div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Related To:</label>
                  <select
                    value={relatedTo}
                    onChange={(e) => {
                      setRelatedTo(e.target.value as any);
                      if (e.target.value !== "contact") setSelectedContact("");
                      if (e.target.value !== "company") setSelectedCompany("");
                    }}
                    className={styles.relatedSelect}
                  >
                    <option value="none">Not Related</option>
                    <option value="company">Company</option>
                    <option value="contact">Contact</option>
                  </select>
                </div>

                {relatedTo === "company" && (
                  <div className={styles.formGroup}>
                    <span className={styles.formLabel}>Company:</span>
                    <input
                      type="text"
                      placeholder="Search company..."
                      value={companySearch}
                      onChange={(e) => {
                        setCompanySearch(e.target.value);
                        const exactMatch = companies.find(
                          (c) =>
                            c.name.toLowerCase() === e.target.value.toLowerCase()
                        );
                        if (exactMatch) {
                          setSelectedCompany(exactMatch.id);
                        }
                      }}
                      className={styles.searchInput}
                    />
                    <select
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        const selectedCompanyName =
                          companies.find((c) => c.id === e.target.value)?.name ||
                          "";
                        setCompanySearch(selectedCompanyName);
                      }}
                      className={styles.companySelect}
                      size={Math.min(filteredCompanies.length + 1, 6)}
                    >
                      <option value="">Select a company...</option>
                      {filteredCompanies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {relatedTo === "contact" && (
                  <div className={styles.formGroup}>
                    <span className={styles.formLabel}>Contact:</span>
                    <input
                      type="text"
                      placeholder="Search contact..."
                      value={contactSearch}
                      onChange={(e) => {
                        setContactSearch(e.target.value);
                        const exactMatch = contacts.find(
                          (c) =>
                            `${c.first_name} ${c.last_name}`.toLowerCase() ===
                            e.target.value.toLowerCase()
                        );
                        if (exactMatch) {
                          setSelectedContact(exactMatch.id);
                        }
                      }}
                      className={styles.searchInput}
                    />
                    <select
                      value={selectedContact}
                      onChange={(e) => {
                        setSelectedContact(e.target.value);
                        const selectedContactName = contacts.find(
                          (c) => c.id === e.target.value
                        );
                        if (selectedContactName) {
                          setContactSearch(
                            `${selectedContactName.first_name} ${selectedContactName.last_name}`
                          );
                        }
                      }}
                      className={styles.contactSelect}
                      size={Math.min(filteredContacts.length + 1, 6)}
                    >
                      <option value="">Select a contact...</option>
                      {filteredContacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                          {contact.company_id
                            ? ` (${companies.find((c) => c.id === contact.company_id)
                              ?.name || ""
                            })`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={styles.formActions}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNote}
                    className={styles.addButton}
                    disabled={!newNote.trim() || isSaving}
                    style={{ width: 'auto' }}
                  >
                    {isSaving ? (
                      <>
                        <span className={styles.spinner}></span> Saving...
                      </>
                    ) : (
                      <>
                        Add Note
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};


export default NotesPage;
