'use client';

import { useState, useEffect } from 'react';
import styles from './styles.module.css';

import ContactDetail from '@/app/components/Contact/ContactDetail';
import CompanyDetail from '@/app/components/Company/CompanyDetail';
import ContactModal from '@/app/components/Contact/ContactModal';
import CompanyModal from '@/app/components/Company/CompanyModal';
import ContactTagsModal from '@/app/components/ContactTagsModal/ContactTagsModal';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { usePermission } from '@/app/hooks/usePermission';
import AccessDeniedTemplate from '@/app/components/ui/AccessDeniedTemplate';
import Skeleton from '@/app/components/ui/Skeleton';

type TabType = 'contacts' | 'companies';

type Contact = {
  id: string;
  display_id?: string;
  title?: string;
  first_name: string;
  last_name: string;
  email?: string;
  company_id?: string;
  company_name?: string;
  phone?: string;
  mobile?: string;
  tags?: string[];
};

type Company = {
  id: string;
  display_id?: string;
  name: string;
  type?: string;
  phone?: string;
  email?: string;
  tags?: string[];
};

type ContactTag = {
  id: string;
  name: string;
  type: 'contact_tag' | 'company_tag';
};

export default function ContactsPage() {
  const { hasPermission, isModuleEnabled, user } = usePermission();
  const [activeTab, setActiveTab] = useState<TabType>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contactTags, setContactTags] = useState<ContactTag[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const contactIdParam = searchParams.get("contactId");
  const toastParam = searchParams.get('toast');

  useEffect(() => {
    fetchData();
    fetchContactTags();
  }, [activeTab]);

  useEffect(() => {
    if (contactIdParam && contacts.length > 0) {
      const found = contacts.find(c => c.id === contactIdParam);
      if (found) {
        setSelectedContact(found);
      }
    }
  }, [contactIdParam, contacts]);


  useEffect(() => {
    if (toastParam === 'meet_created') {
      toast.success('✅ Google Meet created successfully!');
    }
  }, [toastParam]);


  const fetchContactTags = async () => {
    try {
      const response = await fetch('/api/contact-tags');
      if (response.ok) {
        const data = await response.json();
        setContactTags(data);
      }
    } catch (error) {
      console.error('Error fetching contact tags:', error);
    }
  };

  const fetchData = async () => {
    if (!isModuleEnabled('contacts') && user?.type === 'agent') {
      setIsLoading(false);
      return; // Module disabled
    }

    setIsLoading(true);
    setError(null);
    try {
      const endpoint = activeTab === 'contacts' ? '/api/contacts' : '/api/companies';
      const res = await fetch(endpoint);

      if (!res.ok) {
        throw new Error(`Failed to fetch ${activeTab}`);
      }

      const data = await res.json();

      if (activeTab === 'contacts') {
        setContacts(data);
        setSelectedContact(data.length > 0 ? data[0] : null);
      } else {
        setCompanies(data);
        setSelectedCompany(data.length > 0 ? data[0] : null);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Failed to load ${activeTab}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    fetchData();
    setShowContactModal(false);
    setShowCompanyModal(false);
  };

  const handleTagsSuccess = () => {
    fetchContactTags();
  };

  const filteredContacts = contacts.filter(contact =>
    `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    if (!hasPermission('contacts', 'view_all')) { // Using view_all as proxy for export permission
      toast.error('You do not have permission to export contacts');
      return;
    }
    const data = activeTab === 'contacts' ? contacts : companies;
    if (!data.length) {
      toast.error('No data to export');
      return;
    }

    const headers = activeTab === 'contacts'
      ? ['ID', 'Display ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Mobile', 'Company', 'Tags']
      : ['ID', 'Display ID', 'Name', 'Type', 'Email', 'Phone', 'Tags'];

    const csvContent = [
      headers.join(','),
      ...data.map((item: any) => {
        const row = activeTab === 'contacts'
          ? [
            item.id,
            item.display_id || '',
            item.first_name,
            item.last_name,
            item.email || '',
            item.phone || '',
            item.mobile || '',
            `"${(item.company_name || '').replace(/"/g, '""')}"`,
            `"${(item.tags || []).join('; ')}"`
          ]
          : [
            item.id,
            item.display_id || '',
            `"${(item.name || '').replace(/"/g, '""')}"`,
            item.type || '',
            item.email || '',
            item.phone || '',
            `"${(item.tags || []).join('; ')}"`
          ];
        return row.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isLoading && !isModuleEnabled('contacts')) {
    return (
      <AccessDeniedTemplate moduleName="Contacts" />
    );
  }

  return (
    <div className={`${styles.container} ${!isSidebarOpen ? styles.sidebarHidden : ''}`}>
      {/* Top Navigation Bar for Tabs */}
      <div className={styles.topNav}>
        <div className={styles.navTabsContainer}>
          <button
            className={`${styles.navTab} ${activeTab === 'contacts' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('contacts');
              setIsSidebarOpen(true);
            }}
          >
            Contacts
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'companies' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('companies');
              setIsSidebarOpen(true);
            }}
          >
            Companies
          </button>
        </div>

        <div className={styles.topActions}>
          {/* Export Button */}
          {hasPermission('contacts', 'view_all') && (
            <button
              onClick={handleExport}
              className={styles.tagsButton}
              title="Export to CSV"
            >
              <i className="fa-sharp fa-thin fa-file-export"></i>
              <span>Export</span>
            </button>
          )}
          {/* Tags Button */}
          {hasPermission('contacts', 'edit') && (
            <button
              onClick={() => setShowTagsModal(true)}
              className={styles.tagsButton}
              title="Manage Tags"
            >
              <i className="fa-sharp fa-thin fa-tags"></i>
              <span>Tags</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area (Split View) */}
      <div className={styles.contentArea}>
        <div className={`${styles.sidebar} ${!isSidebarOpen ? styles.sidebarClosed : ''}`}>

          {/* Consolidated Sidebar Header (Search + Actions) */}
          <div className={styles.sidebarHeader}>
            <div className={styles.searchWrapper}>
              <i className={`fa-sharp fa-thin fa-search ${styles.searchIcon}`}></i>
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.headerActions}>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className={styles.toggleButton}
                title="Close List"
              >
                <i className="fa-sharp fa-thin fa-chevrons-left"></i>
              </button>
            </div>
          </div>

          <div className={styles.listContainer}>
            {error ? (
              <div className={styles.error}>{error}</div>
            ) : isLoading ? (
              <div className={styles.list}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={styles.listItem} style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Skeleton width={140} height={20} />
                      <Skeleton width={50} height={14} />
                    </div>
                    <Skeleton width={180} height={16} style={{ marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Skeleton width={60} height={22} style={{ borderRadius: '12px' }} />
                      <Skeleton width={60} height={22} style={{ borderRadius: '12px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'contacts' ? (
              <div className={styles.list}>
                {filteredContacts.length > 0 ? (
                  filteredContacts.map(contact => (
                    <div
                      key={contact.id}
                      className={`${styles.listItem} ${selectedContact?.id === contact.id ? styles.selected : ''}`}
                      onClick={() => {
                        setSelectedContact(contact);
                        if (window.innerWidth <= 768) setIsSidebarOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>{`${contact.first_name} ${contact.last_name}`}</h3>
                        <span style={{ fontSize: '12px', color: '#999' }}>#{contact.display_id || String(contact.id).slice(0, 4)}</span>
                      </div>
                      <p>{contact.company_name || 'No company'}</p>
                      {contact.tags && contact.tags.length > 0 && (
                        <div className={styles.tagsContainer}>
                          {contact.tags.map((tag, index) => (
                            <span key={index} className={styles.contactTag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>No contacts found</div>
                )}
              </div>
            ) : (
              <div className={styles.list}>
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map(company => (
                    <div
                      key={company.id}
                      className={`${styles.listItem} ${selectedCompany?.id === company.id ? styles.selected : ''}`}
                      onClick={() => {
                        setSelectedCompany(company);
                        if (window.innerWidth <= 768) setIsSidebarOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>{company.name}</h3>
                        <span style={{ fontSize: '12px', color: '#999' }}>#{company.display_id || String(company.id).slice(0, 4)}</span>
                      </div>
                      <p>{company.type || 'No type specified'}</p>
                      {company.tags && company.tags.length > 0 && (
                        <div className={styles.tagsContainer}>
                          {company.tags.map((tag, index) => (
                            <span key={index} className={styles.companyTag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>No companies found</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className={styles.detailView}
          style={{ backgroundColor: activeTab === 'companies' ? 'white' : undefined }}
        >
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={styles.expandButton}
              title="Show List"
            >
              <i className="fa-sharp fa-thin fa-chevrons-right"></i>
            </button>
          )}
          {activeTab === 'contacts' ? (
            selectedContact ? (
              <ContactDetail
                contact={selectedContact}
                onUpdate={fetchData}
                onDelete={() => {
                  fetchData(); // Force refetch
                  setContacts(contacts.filter(c => c.id !== selectedContact.id));
                  setSelectedContact(contacts.length > 1 ? contacts[0] : null);
                }}
              />
            ) : (
              <div className={styles.emptyDetail}>No contact selected</div>
            )
          ) : selectedCompany ? (
            <CompanyDetail
              company={selectedCompany}
              onAddContact={() => {
                if (hasPermission('contacts', 'create')) {
                  setShowContactModal(true)
                } else {
                  toast.error("Permission denied");
                }
              }}
              onUpdate={fetchData}
              onDelete={() => {
                fetchData(); // Force refetch
                setCompanies(companies.filter(c => c.id !== selectedCompany.id));
                setSelectedCompany(companies.length > 1 ? companies[0] : null);
              }}
            />
          ) : (
            <div className={styles.emptyDetail}>No company selected</div>
          )}
        </div>
      </div>

      {hasPermission('contacts', 'create') && (
        <button
          className={styles.fab}
          onClick={() => activeTab === 'contacts' ? setShowContactModal(true) : setShowCompanyModal(true)}
          aria-label={`Add new ${activeTab.slice(0, -1)}`}
        >
          <i className="fa-light fa-plus"></i>
        </button>
      )}

      {showContactModal && (
        <ContactModal
          onClose={() => setShowContactModal(false)}
          onSuccess={handleCreateSuccess}
          companyId={activeTab === 'companies' ? selectedCompany?.id : undefined}
          isOpen={true}
        />
      )}

      {showCompanyModal && (
        <CompanyModal
          onClose={() => setShowCompanyModal(false)}
          onSuccess={handleCreateSuccess}
          isOpen={true}
        />
      )}

      {showTagsModal && (
        <ContactTagsModal
          isOpen={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          onSuccess={handleTagsSuccess}
          contactTags={contactTags}
        />
      )}
    </div>
  );
}