'use client';

import React, { useState, useEffect } from 'react';
import styles from './LeadModal.module.css';
import ContactModal from '../Contact/ContactModal';
import CompanyModal from '../Company/CompanyModal';
import ServiceCreationModal from '../ServiceCreationModal/ServiceCreationModal';
import SourceModal from '../SourceModal/SourceModal';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id?: string;
    assignment_name?: string;
    contact_id?: string;
    company_id?: string;
    stage?: string;
    service?: string;
    amount?: number;
    closing_date?: string;
    source?: string;
    priority?: string;
    description?: string;
  };
  refreshLeads?: () => void;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company_id?: string;
  email?: string;
  phone?: string;
}

interface Company {
  id: string;
  name: string;
  type?: string;
  registration_number?: string;
}

interface Service {
  id: string;
  service_name: string;
  service_names: string[];
  total_amount: number;
  service_fee: number;
  professional_fee: number;
}

interface SourceOption {
  id: string;
  name: string;
}

export default function LeadModal({
  isOpen,
  onClose,
  initialData,
  refreshLeads
}: LeadModalProps) {
  const [formData, setFormData] = useState({
    assignment_name: '',
    contact_id: '',
    company_id: '',
    stage: 'New',
    service: '',
    amount: '',
    closing_date: '',
    source: '',
    priority: 'Medium',
    assigned_to: '',
    description: ''
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        assignment_name: initialData.assignment_name || '',
        contact_id: initialData.contact_id || '',
        company_id: initialData.company_id || '',
        stage: initialData.stage || 'New',
        service: initialData.service || '',
        amount: initialData.amount ? initialData.amount.toString() : '',
        closing_date: initialData.closing_date ? initialData.closing_date.split('T')[0] : '',
        source: initialData.source || '',
        priority: initialData.priority || 'Medium',
        assigned_to: (initialData as any).assigned_to || '',
        description: initialData.description || ''
      });
    } else {
      // Reset to defaults if creating new
      setFormData({
        assignment_name: '',
        contact_id: '',
        company_id: '',
        stage: 'New',
        service: '',
        amount: '',
        closing_date: '',
        source: '',
        priority: 'Medium',
        assigned_to: '',
        description: ''
      });
    }
  }, [initialData]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<{ id: string, name: string }[]>([]);
  const [companies, setCompanies] = useState<{ id: string, name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string, name: string, username: string }[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Search states for dropdowns
  const [contactSearch, setContactSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');

  // Filtered lists
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  // New service/source creation states


  // Modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchOptions = async () => {
      try {
        setOptionsLoading(true);
        setFetchError('');

        // Reset search states on open
        setContactSearch('');
        setCompanySearch('');

        const [contactsRes, companiesRes, agentsRes, servicesRes] = await Promise.all([
          fetch('/api/contacts'),
          fetch('/api/companies'),
          fetch('/api/agents'),
          fetch('/api/services')
        ]);

        if (!contactsRes.ok) throw new Error('Failed to fetch contacts');
        if (!companiesRes.ok) throw new Error('Failed to fetch companies');
        if (!agentsRes.ok) throw new Error('Failed to fetch agents');
        if (!servicesRes.ok) throw new Error('Failed to fetch services');

        const contactsData: Contact[] = await contactsRes.json();
        const companiesData: Company[] = await companiesRes.json();
        const agentsData = await agentsRes.json();
        const servicesData: Service[] = await servicesRes.json();

        // Transform contacts data to {id, name} format (without company name)
        const transformedContacts = contactsData.map(contact => ({
          id: contact.id,
          name: `${contact.first_name} ${contact.last_name}`
        }));

        // Transform companies data to {id, name} format
        const transformedCompanies = companiesData.map(company => ({
          id: company.id,
          name: company.name
        }));

        // Transform agents data to {id, name, username} format
        const transformedAgents = agentsData.agents?.map((agent: any) => ({
          id: agent.id.toString(),
          name: agent.full_name || agent.username,
          username: agent.username
        })) || [];

        setContacts(transformedContacts);
        setCompanies(transformedCompanies);
        setAgents(transformedAgents);
        setServices(servicesData);

        // Load sources from localStorage or create default ones
        const savedSources = localStorage.getItem('leadSources');
        if (savedSources) {
          setSources(JSON.parse(savedSources));
        } else {
          const defaultSources = [
            { id: '1', name: 'Website' },
            { id: '2', name: 'Referral' },
            { id: '3', name: 'Social Media' },
            { id: '4', name: 'Cold Call' },
            { id: '5', name: 'Email Campaign' },
            { id: '6', name: 'Trade Show' },
            { id: '7', name: 'Partner' }
          ];
          setSources(defaultSources);
          localStorage.setItem('leadSources', JSON.stringify(defaultSources));
        }
      } catch (err) {
        console.error('Error fetching options:', err);
        setFetchError('Failed to load contacts/companies/agents/services. Please try again.');
      } finally {
        setOptionsLoading(false);
      }
    };

    fetchOptions();
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-fill amount when service is selected
    if (name === 'service' && value && value !== '__new__') {
      const selectedService = services.find(s =>
        s.service_name === value ||
        (s.service_names && s.service_names.includes(value))
      );
      if (selectedService && selectedService.total_amount) {
        setFormData(prev => ({
          ...prev,
          amount: selectedService.total_amount.toString()
        }));
      }
    }
  };

  const handleServiceCreated = async (serviceName: string, serviceAmount: string) => {
    // Refresh services list
    const servicesRes = await fetch('/api/services');
    const servicesData = await servicesRes.json();
    setServices(servicesData);

    // Set the new service as selected
    setFormData(prev => ({
      ...prev,
      service: serviceName,
      amount: serviceAmount
    }));

    setShowServiceModal(false);
  };

  const handleSourceCreated = async (sourceName: string) => {
    // Refresh sources list from localStorage
    const savedSources = localStorage.getItem('leadSources');
    if (savedSources) {
      setSources(JSON.parse(savedSources));
    }

    // Set the new source as selected
    setFormData(prev => ({
      ...prev,
      source: sourceName
    }));

    setShowSourceModal(false);
  };

  const handleServiceDropdownChange = (value: string) => {
    if (value === '__new__') {
      setShowServiceModal(true);
    } else {
      setFormData(prev => ({ ...prev, service: value }));
      // Auto-fill amount when service is selected
      if (value) {
        const selectedService = services.find(s =>
          s.service_name === value ||
          (s.service_names && s.service_names.includes(value))
        );
        if (selectedService && selectedService.total_amount) {
          setFormData(prev => ({
            ...prev,
            amount: selectedService.total_amount.toString()
          }));
        }
      }
    }
  };

  const handleSourceDropdownChange = (value: string) => {
    if (value === '__new__') {
      setShowSourceModal(true);
    } else {
      setFormData(prev => ({ ...prev, source: value }));
    }
  };

  const handleContactCreated = async (contactId?: string, contactName?: string) => {
    if (!contactId) return;
    // Refresh contacts list
    const contactsRes = await fetch('/api/contacts');
    const contactsData = await contactsRes.json();
    const transformedContacts = contactsData.map((contact: Contact) => ({
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name}`
    }));
    setContacts(transformedContacts);

    // Set the new contact as selected
    setFormData(prev => ({
      ...prev,
      contact_id: contactId
    }));

    setShowContactModal(false);
  };

  const handleCompanyCreated = async (companyId?: string, companyName?: string) => {
    if (!companyId) return;
    // Refresh companies list
    const companiesRes = await fetch('/api/companies');
    const companiesData = await companiesRes.json();
    const transformedCompanies = companiesData.map((company: Company) => ({
      id: company.id,
      name: company.name
    }));
    setCompanies(transformedCompanies);

    // Set the new company as selected
    setFormData(prev => ({
      ...prev,
      company_id: companyId
    }));

    setShowCompanyModal(false);
  };

  const handleContactDropdownChange = (value: string) => {
    if (value === '__new__') {
      setShowContactModal(true);
    } else {
      setFormData(prev => ({ ...prev, contact_id: value }));
    }
  };

  const handleCompanyDropdownChange = (value: string) => {
    if (value === '__new__') {
      setShowCompanyModal(true);
    } else {
      setFormData(prev => ({ ...prev, company_id: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.assignment_name.trim()) {
        throw new Error('Assignment name is required');
      }
      if (!formData.stage) {
        throw new Error('Stage is required');
      }

      // Clean up special "__new__" values
      const cleanedService = formData.service === '__new__' ? '' : formData.service;
      const cleanedSource = formData.source === '__new__' ? '' : formData.source;
      const cleanedContactId = formData.contact_id === '__new__' ? '' : formData.contact_id;
      const cleanedCompanyId = formData.company_id === '__new__' ? '' : formData.company_id;

      const payload = {
        ...formData,
        contact_id: cleanedContactId,
        company_id: cleanedCompanyId,
        service: cleanedService,
        source: cleanedSource,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        closing_date: formData.closing_date || null
      };


      const url = initialData?.id ? `/api/leads/${initialData.id}` : '/api/leads';
      const method = initialData?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to save lead (${response.status})`);
      }

      onClose();
      if (refreshLeads) {
        refreshLeads();
      }
    } catch (err: any) {
      console.error('Submit error:', err); // Debug log
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{initialData?.id ? 'Edit Lead' : 'Create New Lead'}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-light fa-xmark"></i>
          </button>
        </div>

        {(error || fetchError) && (
          <div className={styles.error}>
            {error || fetchError}
            <button onClick={() => { setError(''); setFetchError(''); }} className={styles.errorClose}>
              &times;
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="assignment_name">Assignment Name *</label>
            <input
              type="text"
              id="assignment_name"
              name="assignment_name"
              value={formData.assignment_name}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="contact_id">Contact</label>
              {optionsLoading ? (
                <select disabled className={styles.select}>
                  <option>Loading contacts...</option>
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search Contact..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    style={{
                      marginBottom: '8px',
                      width: '100%',
                      padding: '0.4rem 0.8rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <select
                    id="contact_id"
                    name="contact_id"
                    value={formData.contact_id}
                    onChange={(e) => handleContactDropdownChange(e.target.value)}
                    style={{
                      fontFamily: '"Open Sauce One", sans-serif',
                      padding: '0.55rem 1rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '15px',
                      color: '#333',
                      backgroundColor: 'white',
                      width: '100%'
                    }}
                  >
                    <option value="" style={{ color: '#333', backgroundColor: 'white' }}>Select Contact</option>
                    {filteredContacts.map(contact => (
                      <option key={contact.id} value={contact.id} style={{ color: '#333', backgroundColor: 'white' }}>
                        {contact.name}
                      </option>
                    ))}
                    <option value="__new__" style={{ color: '#333', backgroundColor: 'white' }}>+ Add New Contact</option>
                  </select>
                </>
              )}
              {!optionsLoading && filteredContacts.length === 0 && contacts.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>No matches found</div>
              )}
              {!optionsLoading && contacts.length === 0 && (
                <div className={styles.warning}>No contacts available</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="company_id">Company</label>
              {optionsLoading ? (
                <select disabled className={styles.select}>
                  <option>Loading companies...</option>
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search Company..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    style={{
                      marginBottom: '8px',
                      width: '100%',
                      padding: '0.4rem 0.8rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <select
                    id="company_id"
                    name="company_id"
                    value={formData.company_id}
                    onChange={(e) => handleCompanyDropdownChange(e.target.value)}
                    style={{
                      fontFamily: '"Open Sauce One", sans-serif',
                      padding: '0.55rem 1rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '15px',
                      color: '#333',
                      backgroundColor: 'white',
                      width: '100%'
                    }}
                  >
                    <option value="" style={{ color: '#333', backgroundColor: 'white' }}>Select Company</option>
                    {filteredCompanies.map(company => (
                      <option key={company.id} value={company.id} style={{ color: '#333', backgroundColor: 'white' }}>
                        {company.name}
                      </option>
                    ))}
                    <option value="__new__" style={{ color: '#333', backgroundColor: 'white' }}>+ Add New Company</option>
                  </select>
                </>
              )}
              {!optionsLoading && filteredCompanies.length === 0 && companies.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>No matches found</div>
              )}
              {!optionsLoading && companies.length === 0 && (
                <div className={styles.warning}>No companies available</div>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="stage">Stage *</label>
              <select
                id="stage"
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                required
                className={styles.select}
              >
                <option value="New">New</option>
                <option value="Qualify">Qualify</option>
                <option value="Proposal">Proposal</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="WON">WON</option>
                <option value="DROP">DROP</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="assigned_to">Assign to Agent</label>
              {optionsLoading ? (
                <select disabled className={styles.select}>
                  <option>Loading agents...</option>
                </select>
              ) : (
                <select
                  id="assigned_to"
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="">Select Agent</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.username})
                    </option>
                  ))}
                </select>
              )}
              {!optionsLoading && agents.length === 0 && (
                <div className={styles.warning}>No agents available</div>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="service">Service</label>
              {optionsLoading ? (
                <select disabled className={styles.select}>
                  <option>Loading services...</option>
                </select>
              ) : (
                <>
                  <select
                    id="service"
                    name="service"
                    value={formData.service}
                    onChange={(e) => handleServiceDropdownChange(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Select Service</option>
                    {services.flatMap(service =>
                      service.service_names && service.service_names.length > 0
                        ? service.service_names.map((serviceName, index) => (
                          <option key={`${service.id}-${index}`} value={serviceName}>
                            {serviceName} - ₹{service.total_amount?.toFixed(2) || '0.00'}
                          </option>
                        ))
                        : [
                          <option key={service.id} value={service.service_name}>
                            {service.service_name} - ₹{service.total_amount?.toFixed(2) || '0.00'}
                          </option>
                        ]
                    )}
                    <option value="__new__">+ Add New Service</option>
                  </select>


                </>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="amount">Amount</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="closing_date">Follow-up Date</label>
              <input
                type="date"
                id="closing_date"
                name="closing_date"
                value={formData.closing_date}
                onChange={handleChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="source">Source</label>
              <select
                id="source"
                name="source"
                value={formData.source}
                onChange={(e) => handleSourceDropdownChange(e.target.value)}
                className={styles.select}
              >
                <option value="">Select Source</option>
                {sources.map(source => (
                  <option key={source.id} value={source.name}>
                    {source.name}
                  </option>
                ))}
                <option value="__new__">+ Add New Source</option>
              </select>


            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={styles.textarea}
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? (
                <span className={styles.loadingText}>
                  <span className={styles.spinner} /> Saving...
                </span>
              ) : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>

      {/* Contact Creation Modal */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => {
          setShowContactModal(false);
        }}
        onSuccess={handleContactCreated}
      />

      {/* Company Creation Modal */}
      <CompanyModal
        isOpen={showCompanyModal}
        onClose={() => {
          setShowCompanyModal(false);
        }}
        onSuccess={handleCompanyCreated}
      />

      {/* Service Creation Modal */}
      <ServiceCreationModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onSuccess={handleServiceCreated}
      />

      {/* Source Creation Modal */}
      <SourceModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        onSuccess={handleSourceCreated}
      />
    </div>
  );
}