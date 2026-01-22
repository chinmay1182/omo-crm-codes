import CompanySelector from '../Company/CompanySelector';
import styles from './contactdetail.module.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import ContactModal from './ContactModal';
import FileUpload from '../File/FileUpload';
import FileList from '../File/FileList';
import NoteList from '../Note/NoteList';
import NoteModal from '../Note/NoteModal';
import TaskList from '../Task/TaskList';
import TaskModal from '../Task/TaskModal';
import ActivityList from '../Activity/ActivityList';
import LocationList from '../Location/LocationList';
import LocationModal from '../Location/LocationModal';
import MeetingList from '../Meeting/MeetingList';
import MeetingModal from '../Meeting/MeetingModal';
import TagSelector from '../TagSelector/TagSelector';
import ContactFormSubmissions from './ContactFormSubmissions';
import ContactEmails from './ContactEmails';
import ContactWhatsApp from './ContactWhatsApp';
import { usePermission } from '@/app/hooks/usePermission';

type ContactTab = 'info' | 'activities' | 'meetings' | 'tasks' | 'notes' | 'files' | 'locations' | 'feedbacks' | 'emails' | 'whatsapp';

type Contact = {
  id: string;
  title?: string;
  first_name: string;
  last_name: string;
  email?: string;
  company_id?: string;
  company_name?: string;
  phone?: string;
  mobile?: string;
  description?: string;
  date_of_birth?: string;
  date_of_anniversary?: string;
  tags?: string[];
};

export default function ContactDetail({
  contact,
  onUpdate,
  onDelete
}: {
  contact: Contact;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const { hasPermission, isModuleEnabled } = usePermission();
  const [activeTab, setActiveTab] = useState<ContactTab>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(contact);

  // Permission flags
  const canEdit = hasPermission('contacts', 'edit');
  const canDelete = hasPermission('contacts', 'delete');
  const canViewUnmasked = hasPermission('contacts', 'view_unmasked');

  // Masked values
  const displayEmail = canViewUnmasked ? contact.email : (contact.email ? '********' : '');
  const displayPhone = canViewUnmasked ? contact.phone : (contact.phone ? '********' : '');
  const displayMobile = canViewUnmasked ? contact.mobile : (contact.mobile ? '********' : '');

  // Update formData when contact prop changes
  useEffect(() => {
    setFormData(contact);
    setIsEditing(false);
    setIsSaving(false);
  }, [contact]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshFiles, setRefreshFiles] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [refreshNotes, setRefreshNotes] = useState(false);
  const [refreshTasks, setRefreshTasks] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [refreshLocations, setRefreshLocations] = useState(false);
  const [refreshActivities, setRefreshActivities] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [refreshMeetings, setRefreshMeetings] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [selectedMeeting, setSelectedMeeting] = useState<null | {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    participants?: string;
  }>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!canEdit) return; // Guard
    if (isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update contact');
      }

      onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error(`Error updating contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return; // Guard
    if (confirm('Are you sure you want to delete this contact?')) {
      setIsDeleting(true);
      try {
        const response = await fetch(`/api/contacts/${contact.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          onDelete();
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || 'Failed to delete contact');
        }
      } catch (error) {
        console.error('Error deleting contact:', error);
        toast.error('Error deleting contact');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div>
      <div className={styles.container}>
        <div className={styles.header}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '12px', width: '70%', alignItems: 'center' }}>
              <select
                title="Title"
                name="title"
                value={formData.title || ''}
                onChange={handleInputChange}
                className={styles.headerEditInput}
                style={{ width: '100px' }}
              >
                <option value="">Title</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Dr.">Dr.</option>
              </select>
              <input
                title="First Name"
                type="text"
                name="first_name"
                placeholder="First Name"
                value={formData.first_name || ''}
                onChange={handleInputChange}
                className={styles.headerEditInput}
                style={{ flex: 1 }}
              />
              <input
                title="Last Name"
                type="text"
                name="last_name"
                placeholder="Last Name"
                value={formData.last_name || ''}
                onChange={handleInputChange}
                className={styles.headerEditInput}
                style={{ flex: 1 }}
              />
            </div>
          ) : (
            <h2>{`${contact.title || ''} ${contact.first_name} ${contact.last_name}`.trim()}</h2>
          )}
          <div className={styles.actions}>
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className={styles.saveButton}
                  disabled={isSaving}
                >

                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(contact); // Reset on cancel
                  }}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <>
                  {canEdit && (
                    <button onClick={() => setIsEditing(true)} className={styles.editButton}>
                      <span>Edit</span>
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={handleDelete} disabled={isDeleting} className={styles.deleteButton}>
                      <span>Delete</span>
                    </button>
                  )}
                </>
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tab} ${activeTab === 'info' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Info
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'activities' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            Activities
          </button>
          {isModuleEnabled('meetings') && (
            <button
              className={`${styles.tab} ${activeTab === 'meetings' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('meetings')}
            >
              Meetings
            </button>
          )}
          {isModuleEnabled('tasks') && (
            <button
              className={`${styles.tab} ${activeTab === 'tasks' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              Tasks
            </button>
          )}
          {isModuleEnabled('notes') && (
            <button
              className={`${styles.tab} ${activeTab === 'notes' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              Notes
            </button>
          )}
          <button
            className={`${styles.tab} ${activeTab === 'files' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('files')}
          >
            Files
          </button>
          {/* Locations might be part of Core Contacts or explicit. Assuming core for now.*/}
          <button
            className={`${styles.tab} ${activeTab === 'locations' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('locations')}
          >
            Locations
          </button>
          {/* Emails requires view_unmasked? Not specified, but logical. Keeping enabled for now but data masked */}
          <button
            className={`${styles.tab} ${activeTab === 'emails' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('emails')}
          >
            Emails
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'whatsapp' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            WhatsApp
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'feedbacks' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('feedbacks')}
          >
            Feedbacks
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === 'info' && (
            <div className={styles.infoTab}>
              {isEditing ? (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                      className={styles.editInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Mobile</label>
                    <input
                      type="text"
                      name="mobile"
                      value={formData.mobile || ''}
                      onChange={handleInputChange}
                      className={styles.editInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className={styles.editInput}
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGroupFull}`} style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#444' }}>Company Association</label>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="companyMode"
                          checked={formData.company_id !== undefined && formData.company_id !== '' && formData.company_id !== null}
                          onChange={() => { }}
                        />
                        Select Existing
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer', opacity: 0.5 }}>
                        <input type="radio" name="companyMode" disabled /> Create New (Coming Soon)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="companyMode"
                          checked={!formData.company_id}
                          onChange={() => setFormData(prev => ({ ...prev, company_id: '' }))}
                        />
                        Not Applicable
                      </label>
                    </div>

                    <CompanySelector
                      selectedCompanyId={formData.company_id || ''}
                      onCompanyChange={(companyId) => {
                        setFormData(prev => ({ ...prev, company_id: companyId || undefined }));
                      }}
                      className={styles.editInput}
                      hideModeSelector={true}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split('T')[0] : ''}
                      onChange={handleInputChange}
                      className={styles.editInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Anniversary</label>
                    <input
                      type="date"
                      name="date_of_anniversary"
                      value={formData.date_of_anniversary ? new Date(formData.date_of_anniversary).toISOString().split('T')[0] : ''}
                      onChange={handleInputChange}
                      className={styles.editInput}
                    />
                  </div>
                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description || ''}
                      onChange={handleInputChange}
                      rows={4}
                      className={styles.editInput}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {contact.company_name && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>
                        Company:
                      </span>
                      <span className={styles.value}>{contact.company_name}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>
                        Email:
                      </span>
                      <a href={canViewUnmasked ? `mailto:${contact.email}` : '#'} className={styles.value}>
                        {displayEmail}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>
                        Phone:
                      </span>
                      <a href={canViewUnmasked ? `tel:${contact.phone}` : '#'} className={styles.value}>
                        {displayPhone}
                      </a>
                    </div>
                  )}
                  {contact.mobile && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>
                        Mobile:
                      </span>
                      <a href={canViewUnmasked ? `tel:${contact.mobile}` : '#'} className={styles.value}>
                        {displayMobile}
                      </a>
                    </div>
                  )}
                  {contact.date_of_birth && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>
                        Date of Birth:
                      </span>
                      <span className={styles.value}>{formatDate(contact.date_of_birth)}</span>
                    </div>
                  )}
                  {contact.date_of_anniversary && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>
                        Anniversary:
                      </span>
                      <span className={styles.value}>{formatDate(contact.date_of_anniversary)}</span>
                    </div>
                  )}
                  {contact.description && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Description:</span>
                      <p className={styles.value}>{contact.description}</p>
                    </div>
                  )}

                  {!isEditing && (
                    <TagSelector
                      entityId={contact.id}
                      entityType="contact"
                      currentTags={contact.tags || []}
                      onTagsUpdate={onUpdate}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className={styles.tabPanel}>
              <h3>Activities</h3>
              <ActivityList contactId={contact.id} key={refreshActivities ? 'refresh' : 'normal'} />
            </div>
          )}

          {activeTab === 'meetings' && isModuleEnabled('meetings') && (
            <div className={styles.tabPanel}>
              {/* ... Meeting List ... */}
              <div className={styles.meetingsContainer}>
                <div className={styles.myHeadingTwo}>
                  <h3>Meetings</h3>
                  <button
                    onClick={() => {
                      setSelectedMeeting(null);
                      setIsMeetingModalOpen(true);
                    }}
                    className={styles.addButtonTwo}
                  >
                    Schedule Meeting
                  </button>
                </div>
                <MeetingList
                  contactId={contact.id}
                  key={refreshMeetings ? 'refresh' : 'normal'}
                  onEditMeeting={(meeting) => {
                    setSelectedMeeting(meeting);
                    setIsMeetingModalOpen(true);
                  }}
                />
              </div>
              <MeetingModal
                contactId={contact.id}
                onSuccess={() => {
                  setIsMeetingModalOpen(false);
                  setRefreshMeetings((prev) => !prev);
                  setRefreshActivities((prev) => !prev);
                  setSelectedMeeting(null);
                }}
                onClose={() => {
                  setIsMeetingModalOpen(false);
                  setSelectedMeeting(null);
                }}
                isOpen={isMeetingModalOpen}
                initialParticipants={selectedMeeting?.participants || ''}
                initialTitle={selectedMeeting?.title || ''}
                initialDescription={selectedMeeting?.description || ''}
                initialStartTime={selectedMeeting?.start_time || ''}
                initialEndTime={selectedMeeting?.end_time || ''}
                initialLocation={selectedMeeting?.location || ''}
              />
            </div>
          )}

          {activeTab === 'notes' && isModuleEnabled('notes') && (
            <div className={styles.tabPanel}>
              <div className={styles.notesContainer}>
                <div className={styles.myHeadingTwo}>
                  <h3>Notes</h3>
                  {hasPermission('notes', 'create') && (
                    <button
                      onClick={() => setIsNoteModalOpen(true)}
                      className={styles.addButtonTwo}
                    >
                      Add Note
                    </button>
                  )}
                </div>
                <NoteList contactId={contact.id} key={refreshNotes ? 'refresh' : 'normal'} />
              </div>
              <NoteModal
                contactId={contact.id}
                onSuccess={() => {
                  setIsNoteModalOpen(false);
                  setRefreshNotes(prev => !prev);
                }}
                onClose={() => setIsNoteModalOpen(false)}
                isOpen={isNoteModalOpen}
              />
            </div>
          )}

          {activeTab === 'tasks' && isModuleEnabled('tasks') && (
            <div className={styles.tabPanel}>
              <div className={styles.tasksContainer}>
                <div className={styles.myHeadingTwo}>
                  <h3>Tasks</h3>
                  {hasPermission('tasks', 'create') && (
                    <button
                      onClick={() => setIsTaskModalOpen(true)}
                      className={styles.addButtonTwo}
                    >
                      Add Task
                    </button>
                  )}
                </div>
                <TaskList contactId={contact.id} key={refreshTasks ? 'refresh' : 'normal'} />
              </div>
              <TaskModal
                contactId={contact.id}
                onSuccess={() => {
                  setIsTaskModalOpen(false);
                  setRefreshTasks(prev => !prev);
                }}
                onClose={() => setIsTaskModalOpen(false)}
                isOpen={isTaskModalOpen}
              />
            </div>
          )}

          {/* Files, Locations, Emails, Whatsapp can follow similar pattern if needed. 
              Keeping them standard for now. */}

          {activeTab === 'files' && (
            <div className={styles.tabPanel}>
              <div className={styles.filesContainer}>
                <div className={styles.myHeadingTwo}>
                  <h3>My files</h3>
                  <button className={styles.uploadButton} onClick={() => setIsUploadModalOpen(true)}>Upload File</button>
                </div>
                <FileUpload
                  contactId={contact.id}
                  onUploadSuccess={() => {
                    setIsUploadModalOpen(false);
                    setRefreshFiles(prev => !prev);
                  }}
                  onClose={() => setIsUploadModalOpen(false)}
                  isOpen={isUploadModalOpen}
                />
                <FileList contactId={contact.id} key={refreshFiles ? 'refresh' : 'normal'} />
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className={styles.tabPanel}>
              <div className={styles.locationsContainer}>
                <div className={styles.myHeadingTwo}>
                  <h3>Locations</h3>
                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className={styles.addButtonTwo}
                  >
                    Add Location
                  </button>
                </div>
                <LocationList contactId={contact.id} key={refreshLocations ? 'refresh' : 'normal'} />
              </div>
              <LocationModal
                contactId={contact.id}
                onSuccess={() => {
                  setIsLocationModalOpen(false);
                  setRefreshLocations(prev => !prev);
                  setRefreshActivities(prev => !prev);
                }}
                onClose={() => setIsLocationModalOpen(false)}
                isOpen={isLocationModalOpen}
              />
            </div>
          )}

          {activeTab === 'emails' && (
            <div className={styles.tabPanel}>
              <ContactEmails contactId={contact.id} contactEmail={contact.email} />
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className={styles.tabPanel} style={{ height: '100%' }}>
              <ContactWhatsApp contactId={contact.id} contactMobile={contact.mobile} contactPhone={contact.phone} />
            </div>
          )}

          {activeTab === 'feedbacks' && (
            <div className={styles.tabPanel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3>Feedbacks & Form Submissions</h3>
              </div>
              <ContactFormSubmissions
                contact={contact}
                onScheduleMeeting={(submission) => {
                  try {
                    const content = JSON.parse(submission.content);
                    // Format description from content
                    let desc = `Based on submission: ${submission.forms?.name}\n\n`;
                    Object.entries(content).forEach(([key, val]) => {
                      if (key !== 'contact_id') {
                        desc += `${key}: ${val}\n`;
                      }
                    });

                    // Pre-fill modal
                    setSelectedMeeting({
                      id: '',
                      title: `Follow-up: ${submission.forms?.name}`,
                      description: desc,
                      start_time: '',
                      end_time: '',
                      location: '',
                      participants: contact.email || ''
                    });
                    setIsMeetingModalOpen(true);
                  } catch (e) {
                    console.error("Error parsing submission content", e);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <ContactModal
          contact={contact}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            onUpdate();
            setShowEditModal(false);
          }}
          companyId={contact.company_id}
          companyName={contact.company_name}
          isOpen={true}
        />
      )}
    </div>
  );
}