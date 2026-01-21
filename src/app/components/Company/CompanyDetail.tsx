'use client';

import React, { useState, useEffect } from 'react';

import styles from './companydetail.module.css';
import FileUpload from '../File/FileUpload';
import FileList from '../File/FileList';
import NoteList from '../Note/NoteList';
import NoteModal from '../Note/NoteModal';
import toast from 'react-hot-toast';
import ContactSelector from '../Contact/ContactSelector';

import TaskList from '../Task/TaskList';
import TaskModal from '../Task/TaskModal';
import ActivityList from '../Activity/ActivityList';
import LocationList from '../Location/LocationList';
import LocationModal from '../Location/LocationModal';
import MeetingList from '../Meeting/MeetingList';
import MeetingModal from '../Meeting/MeetingModal';
import TagSelector from '../TagSelector/TagSelector';
import CompanyEmails from './CompanyEmails';
import CompanyWhatsApp from './CompanyWhatsApp';

import CompanyRegistrations from './CompanyRegistrations';

type CompanyTab = 'info' | 'activities' | 'meetings' | 'tasks' | 'notes' | 'files' | 'locations' | 'emails' | 'whatsapp' | 'registrations';

type KeyPerson = {
  id?: string;
  name: string;
  mobile: string;
  designation: string;
  email: string;
};

interface CompanyDetailProps {
  company: {
    id: string;
    name: string;
    type?: string;
    phone?: string;
    email?: string;
    website?: string;
    description?: string;
    tags?: string[];
  };
  onAddContact: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function CompanyDetail({ company, onAddContact, onUpdate, onDelete }: CompanyDetailProps) {
  const [activeTab, setActiveTab] = useState<CompanyTab>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(company);
  const [associatedContactId, setAssociatedContactId] = useState<string>('');

  // Update formData when company prop changes
  React.useEffect(() => {
    setFormData(company);
    setIsEditing(false); // Exit edit mode when switching companies
    setIsSaving(false); // Reset saving state
  }, [company]);
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

  const [keyPerson, setKeyPerson] = useState<KeyPerson | null>(null);
  const [isEditingKeyPerson, setIsEditingKeyPerson] = useState(false);
  const [keyPersonForm, setKeyPersonForm] = useState<KeyPerson>({ name: '', mobile: '', designation: '', email: '' });

  const fetchKeyPerson = async () => {
    try {
      const res = await fetch(`/api/companies/${company.id}/key-person`);
      if (res.ok) {
        const data = await res.json();
        setKeyPerson(data);
        if (data) {
          setKeyPersonForm({
            name: data.name || '',
            mobile: data.mobile || '',
            designation: data.designation || '',
            email: data.email || ''
          });
        } else {
          setKeyPersonForm({ name: '', mobile: '', designation: '', email: '' });
        }
      }
    } catch (e) {
      console.error("Failed to fetch key person", e);
    }
  };

  React.useEffect(() => {
    fetchKeyPerson();
  }, [company.id]);

  const handleSaveKeyPerson = async () => {
    if (!keyPersonForm.name) {
      toast.error("Name is required");
      return;
    }
    try {
      const res = await fetch(`/api/companies/${company.id}/key-person`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keyPersonForm)
      });
      if (res.ok) {
        const data = await res.json();
        setKeyPerson(data);
        setIsEditingKeyPerson(false);
        toast.success("Key person saved");
      } else {
        toast.error("Failed to save key person");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving key person");
    }
  };


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
    if (isSaving) return; // Prevent multiple submissions

    setIsSaving(true);
    try {
      // 1. Update Company
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update company');
      }

      // 2. Associate Contact if selected
      if (associatedContactId) {
        try {
          // We need to fetch the contact first to preserve other fields OR ensure api accepts partial.
          // The API code I read for /api/contacts/[id] seems to accept partials (it checks `if (company_name)` then `if (company_id)` etc.)
          // However, it extracts values from body: const { first_name, last_name ... } = body;
          // And checks `if (!first_name || !last_name)`.
          // THIS IS A PROBLEM. The API requires first_name and last_name.

          // So I MUST fetch the contact first.

          const getRes = await fetch(`/api/contacts/${associatedContactId}`);
          if (getRes.ok) {
            const contactData = await getRes.json();
            const updatePayload = {
              ...contactData,
              company_id: company.id
              // map specific fields if needed but usually ...contactData covers it, 
              // just be careful about read-only fields or derived ones?
              // The API expects: title, first_name, last_name, email, company_id, phone, mobile, description, dob, anniv
            };

            const updateRes = await fetch(`/api/contacts/${associatedContactId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatePayload)
            });

            if (!updateRes.ok) {
              console.error("Failed to associate contact");
              toast.error("Failed to associate contact");
            }
          }
        } catch (e) {
          console.error("Error associating contact", e);
        }
      }

      // Show success message
      toast.success('Company updated successfully!');
      if (associatedContactId) {
        toast.success('Contact associated!');
        setAssociatedContactId('');
      }

      onUpdate(); // Refresh the parent component
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error(`Error updating company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this company?')) {
      try {
        const response = await fetch(`/api/companies/${company.id}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('Company deleted successfully');
          onDelete();
        } else {
          toast.error(data.error || 'Failed to delete company');
          if (data.contactCount) {
            toast.error(`Cannot delete: ${data.contactCount} contacts associated.`);
          }
        }
      } catch (error) {
        console.error('Error deleting company:', error);
        toast.error('Error deleting company');
      }
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>

      <div className={styles.detailContainer}>
        <div className={styles.detailHeader}>
          {isEditing ? (
            <input
              title="none"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={styles.editInput}
            />
          ) : (
            <h2>{company.name}</h2>
          )}
          <div className={styles.detailActions}>
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className={styles.saveButton}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setIsEditing(false)} className={styles.cancelButton}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button title="none" onClick={() => setIsEditing(true)} className={styles.editButton}>
                  <span>Edit</span>
                </button>
                <button title="Add Contact" onClick={onAddContact} className={styles.addButton}>
                  <span>Add Contact</span>
                </button>
                <button title="Delete Company" onClick={handleDelete} className={styles.deleteButton}>
                  <span>Delete</span>
                </button>
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
          <button
            className={`${styles.tab} ${activeTab === 'meetings' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('meetings')}
          >
            Meetings
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'tasks' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'notes' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'files' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('files')}
          >
            Files
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'locations' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('locations')}
          >
            Locations
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'emails' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('emails')}
          >
            Emails
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'registrations' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('registrations')}
          >
            Registrations
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'whatsapp' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            WhatsApp
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === 'info' && (
            <div className={styles.infoTab}>
              {isEditing ? (
                <div className={styles.editForm}>
                  <div className={styles.formGroup}>
                    <label>Type</label>
                    <select
                      name="type"
                      value={formData.type || ''}
                      onChange={handleInputChange}
                      className={styles.editInput}
                      style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="">Select Type</option>
                      <option value="Private Limited">Private Limited</option>
                      <option value="Public Limited">Public Limited</option>
                      <option value="LLP">LLP</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>GSTIN Number</label>
                    <input
                      title="none"
                      type="text"
                      name="registration_number"
                      value={(formData as any).registration_number || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Phone</label>
                    <input
                      title="none"
                      type="text"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input
                      title="none"
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Website</label>
                    <input
                      title="none"
                      type="url"
                      name="website"
                      value={formData.website || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Address</label>
                    <input
                      title="none"
                      type="text"
                      name="address"
                      value={(formData as any).address || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>City</label>
                    <input
                      title="none"
                      type="text"
                      name="city"
                      value={(formData as any).city || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>State</label>
                    <input
                      title="none"
                      type="text"
                      name="state"
                      value={(formData as any).state || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Country</label>
                    <input
                      title="none"
                      type="text"
                      name="country"
                      value={(formData as any).country || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Postal Code</label>
                    <input
                      title="none"
                      type="text"
                      name="postal_code"
                      value={(formData as any).postal_code || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      title="none"
                      name="description"
                      value={formData.description || ''}
                      onChange={handleInputChange}
                      rows={4}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <ContactSelector
                      onContactSelect={setAssociatedContactId}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {company.type && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Type:</span>
                      <span className={styles.value}>{company.type}</span>
                    </div>
                  )}
                  {(company as any).registration_number && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>GSTIN / Registration Number:</span>
                      <span className={styles.value}>{(company as any).registration_number}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Phone:</span>
                      <span className={styles.value}>{company.phone}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Email:</span>
                      <span className={styles.value}>{company.email}</span>
                    </div>
                  )}
                  {company.website && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Website:</span>
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className={styles.value}>
                        {company.website}
                      </a>
                    </div>
                  )}
                  {(company as any).address && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Address:</span>
                      <span className={styles.value}>{(company as any).address}</span>
                    </div>
                  )}
                  {(company as any).city && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>City:</span>
                      <span className={styles.value}>{(company as any).city}</span>
                    </div>
                  )}
                  {(company as any).state && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>State:</span>
                      <span className={styles.value}>{(company as any).state}</span>
                    </div>
                  )}
                  {(company as any).country && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Country:</span>
                      <span className={styles.value}>{(company as any).country}</span>
                    </div>
                  )}
                  {(company as any).postal_code && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Postal Code:</span>
                      <span className={styles.value}>{(company as any).postal_code}</span>
                    </div>
                  )}
                  {company.description && (
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Description:</span>
                      <p className={styles.value}>{company.description}</p>
                    </div>
                  )}

                  {!isEditing && (
                    <div style={{ backgroundColor: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '16px', marginBottom: '16px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, color: '#c62828', fontSize: '1rem', fontWeight: 600 }}>Key Contact Person</h4>
                        {!isEditingKeyPerson && (
                          <button
                            onClick={() => setIsEditingKeyPerson(true)}
                            style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: '14px' }}
                            title={keyPerson ? "Edit Key Person" : "Add Key Person"}
                          >
                            {keyPerson ? 'Edit' : 'Add'}
                          </button>
                        )}
                      </div>

                      {isEditingKeyPerson ? (
                        <div className={styles.editForm}>
                          <div className={styles.formGroup}>
                            <label style={{ color: '#c62828' }}>Name</label>
                            <input
                              type="text"
                              value={keyPersonForm.name}
                              onChange={(e) => setKeyPersonForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Name"
                              style={{ border: '1px solid #ffcdd2', padding: '8px', borderRadius: '4px', width: '100%' }}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label style={{ color: '#c62828' }}>Designation</label>
                            <input
                              type="text"
                              value={keyPersonForm.designation}
                              onChange={(e) => setKeyPersonForm(prev => ({ ...prev, designation: e.target.value }))}
                              placeholder="Designation"
                              style={{ border: '1px solid #ffcdd2', padding: '8px', borderRadius: '4px', width: '100%' }}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label style={{ color: '#c62828' }}>Mobile</label>
                            <input
                              type="text"
                              value={keyPersonForm.mobile}
                              onChange={(e) => setKeyPersonForm(prev => ({ ...prev, mobile: e.target.value }))}
                              placeholder="Mobile"
                              style={{ border: '1px solid #ffcdd2', padding: '8px', borderRadius: '4px', width: '100%' }}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label style={{ color: '#c62828' }}>Email</label>
                            <input
                              type="text"
                              value={keyPersonForm.email}
                              onChange={(e) => setKeyPersonForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Email"
                              style={{ border: '1px solid #ffcdd2', padding: '8px', borderRadius: '4px', width: '100%' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button onClick={handleSaveKeyPerson} style={{ backgroundColor: '#c62828', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                            <button onClick={() => setIsEditingKeyPerson(false)} style={{ backgroundColor: '#fff', color: '#c62828', border: '1px solid #c62828', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        keyPerson ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div><strong style={{ color: '#b71c1c' }}>Name:</strong> {keyPerson.name}</div>
                            <div><strong style={{ color: '#b71c1c' }}>Designation:</strong> {keyPerson.designation || '-'}</div>
                            <div><strong style={{ color: '#b71c1c' }}>Mobile:</strong> {keyPerson.mobile || '-'}</div>
                            <div><strong style={{ color: '#b71c1c' }}>Email:</strong> {keyPerson.email || '-'}</div>
                          </div>
                        ) : (
                          <p style={{ color: '#d32f2f', fontSize: '14px', fontStyle: 'italic' }}>No key person details added.</p>
                        )
                      )}
                    </div>
                  )}

                  {!isEditing && (
                    <TagSelector
                      entityId={company.id}
                      entityType="company"
                      currentTags={company.tags || []}
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
              <ActivityList companyId={company.id} key={refreshActivities ? 'refresh' : 'normal'} />
            </div>
          )}


          {activeTab === 'meetings' && (
            <div className={styles.tabPanel}>
              <div className={styles.meetingsContainer}>
                <div className={styles.locationFlex}>
                  <h3>Meetings</h3>
                  <button
                    onClick={() => {
                      setSelectedMeeting(null); // clear selected meeting to create new
                      setIsMeetingModalOpen(true);
                    }}
                    className={styles.addButtonTwo}
                  >
                    Schedule Meeting
                  </button>
                </div>
                <MeetingList
                  companyId={company.id}
                  key={refreshMeetings ? 'refresh' : 'normal'}
                  onEditMeeting={(meeting) => {
                    setSelectedMeeting(meeting);
                    setIsMeetingModalOpen(true);
                  }}
                />
              </div>
              <MeetingModal
                companyId={company.id}
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


          {activeTab === 'notes' && (
            <div className={styles.tabPanel}>

              <div className={styles.notesContainer}>
                <div className={styles.myHeadingTwo}>
                  <h3>Notes</h3>
                  <button
                    onClick={() => setIsNoteModalOpen(true)}
                    className={styles.addButtonTwo}
                  >
                    Add Note
                  </button>
                </div>
                <NoteList companyId={company.id} key={refreshNotes ? 'refresh' : 'normal'} />
              </div>
              <NoteModal
                companyId={company.id}
                onSuccess={() => {
                  setIsNoteModalOpen(false);
                  setRefreshNotes(prev => !prev);
                }}
                onClose={() => setIsNoteModalOpen(false)}
                isOpen={isNoteModalOpen}
              />
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className={styles.tabPanel}>

              <div className={styles.tasksContainer}>
                <div className={styles.myHeadingTwo}>
                  <h3>Tasks</h3>
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className={styles.addButtonTwo}
                  >
                    Add Task
                  </button>
                </div>
                <TaskList companyId={company.id} key={refreshTasks ? 'refresh' : 'normal'} />
              </div>
              <TaskModal
                companyId={company.id}
                onSuccess={() => {
                  setIsTaskModalOpen(false);
                  setRefreshTasks(prev => !prev);
                }}
                onClose={() => setIsTaskModalOpen(false)}
                isOpen={isTaskModalOpen}
              />
            </div>
          )}

          {activeTab === 'files' && (
            <div className={styles.tabPanel}>
              <div className={styles.filesContainer}>
                <div className={styles.myHeadingTwo}>
                  <h3>My files</h3>
                  <button className={styles.uploadButton} onClick={() => setIsUploadModalOpen(true)}>Upload File</button>
                </div>
                <FileUpload
                  companyId={company.id}
                  onUploadSuccess={() => {
                    setIsUploadModalOpen(false);
                    setRefreshFiles(prev => !prev);
                  }}
                  onClose={() => setIsUploadModalOpen(false)}
                  isOpen={isUploadModalOpen}
                />
                <FileList companyId={company.id} key={refreshFiles ? 'refresh' : 'normal'} />
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className={styles.tabPanel}>

              <div className={styles.locationsContainer}>

                <div className={styles.locationFlex}>
                  <h3>Locations</h3>
                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className={styles.addButtonTwo}
                  >
                    Add Location
                  </button>
                </div>

                <LocationList companyId={company.id} key={refreshLocations ? 'refresh' : 'normal'} />
              </div>
              <LocationModal
                companyId={company.id}
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
              <CompanyEmails companyId={company.id} companyEmail={company.email} />
            </div>
          )}

          {activeTab === 'registrations' && (
            <div className={styles.tabPanel}>
              <CompanyRegistrations companyId={company.id} />
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className={styles.tabPanel} style={{ height: '100%' }}>
              <CompanyWhatsApp companyId={company.id} companyPhone={company.phone} />
            </div>
          )}
        </div>
      </div></div>

  );
}