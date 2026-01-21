'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './LeadForm.module.css';
import ContactModal from '../Contact/ContactModal';
import CompanyModal from '../Company/CompanyModal';
import ServiceCreationModal from '../ServiceCreationModal/ServiceCreationModal';
import SourceModal from '../SourceModal/SourceModal';

interface LeadFormProps {
  initialData?: {
    id?: string;
    assignment_name?: string;
    contact_id?: string;
    company_id?: string;
    stage?: string;
    service?: string;
    amount?: number;
    closing_date?: string | Date;
    source?: string;
    priority?: string;
    description?: string;
  };
}

interface Option {
  id: string;
  name: string;
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

export default function LeadForm({ initialData }: LeadFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    assignment_name: initialData?.assignment_name || '',
    contact_id: initialData?.contact_id || '',
    company_id: initialData?.company_id || '',
    stage: initialData?.stage || 'New',
    service: initialData?.service || '',
    amount: initialData?.amount?.toString() || '',
    closing_date: formatDateForInput(initialData?.closing_date),
    source: initialData?.source || '',
    priority: initialData?.priority || 'Medium',
    description: initialData?.description || ''
  });
  const [contacts, setContacts] = useState<Option[]>([]);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // New service/source creation states
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceAmount, setNewServiceAmount] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [creatingService, setCreatingService] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);

  // Modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);

  // Helper function to format date for input field
  function formatDateForInput(date?: string | Date): string {
    if (!date) return '';

    // If it's already a string in YYYY-MM-DD format
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }

    // If it's a Date object or ISO string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  }

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [contactsRes, companiesRes, servicesRes] = await Promise.all([
          fetch('/api/contacts'),
          fetch('/api/companies'),
          fetch('/api/services')
        ]);

        const contactsData = await contactsRes.json();
        const companiesData = await companiesRes.json();
        const servicesData = await servicesRes.json();

        // Transform contacts to {id, name} format
        const transformedContacts = (contactsData || []).map((contact: any) => ({
          id: contact.id,
          name: `${contact.first_name} ${contact.last_name}`.trim()
        }));

        // Transform companies to {id, name} format
        const transformedCompanies = (companiesData || []).map((company: any) => ({
          id: company.id,
          name: company.name
        }));

        setContacts(transformedContacts);
        setCompanies(transformedCompanies);
        setServices(servicesData || []);

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
      } catch (error) {
        console.error('Error fetching options:', error);
      }
    }

    fetchOptions();
  }, []);

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

  const handleCreateNewService = async () => {
    if (!newServiceName.trim() || !newServiceAmount.trim()) {
      setError('Please enter both service name and amount');
      return;
    }

    setCreatingService(true);
    try {
      const serviceData = {
        unique_service_code: `LEAD-${Date.now()}`,
        service_name: newServiceName,
        service_names: [newServiceName],
        service_categories: ['Lead Generated'],
        service_type: 'pre_engagement',
        service_tat: new Date().toISOString().split('T')[0],
        service_fee: parseFloat(newServiceAmount),
        professional_fee: 0,
        discount: 0,
        challan_associated: '',
        gst_amount: parseFloat(newServiceAmount) * 0.18,
        total_amount: parseFloat(newServiceAmount) * 1.18
      };

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData)
      });

      if (!response.ok) {
        throw new Error('Failed to create service');
      }

      // Refresh services list
      const servicesRes = await fetch('/api/services');
      const servicesData = await servicesRes.json();
      setServices(servicesData);

      // Set the new service as selected
      setFormData(prev => ({
        ...prev,
        service: newServiceName,
        amount: (parseFloat(newServiceAmount) * 1.18).toString()
      }));

      // Reset form
      setNewServiceName('');
      setNewServiceAmount('');
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingService(false);
    }
  };

  const handleCreateNewSource = async () => {
    if (!newSourceName.trim()) {
      setError('Please enter source name');
      return;
    }

    setCreatingSource(true);
    try {
      const newSource = {
        id: Date.now().toString(),
        name: newSourceName
      };

      const updatedSources = [...sources, newSource];
      setSources(updatedSources);
      localStorage.setItem('leadSources', JSON.stringify(updatedSources));

      // Set the new source as selected
      setFormData(prev => ({
        ...prev,
        source: newSourceName
      }));

      // Reset form
      setNewSourceName('');
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingSource(false);
    }
  };

  const handleContactCreated = async (contactId?: string, contactName?: string) => {
    if (!contactId) return;
    // Refresh contacts list
    const contactsRes = await fetch('/api/contacts');
    const contactsData = await contactsRes.json();
    setContacts(contactsData || []);

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
    setCompanies(companiesData || []);

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

      router.push('/dashboard/lead-management');
      router.refresh();
    } catch (err: any) {
      console.error('Submit error:', err); // Debug log
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={styles.container}>
      <h1>{initialData?.id ? 'Edit Lead' : 'Create New Lead'}</h1>

      {error && <div className={styles.error}>{error}</div>}

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
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="contact_id">Contact</label>
            <select
              id="contact_id"
              name="contact_id"
              value={formData.contact_id}
              onChange={(e) => handleContactDropdownChange(e.target.value)}
              style={{
                padding: '0.55rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '15px',
                color: '#333 !important',
                backgroundColor: 'white !important',
                width: '100%'
              }}
            >
              <option value="" style={{ color: '#333 !important', backgroundColor: 'white !important' }}>Select Contact</option>
              {contacts.map(contact => (
                <option key={contact.id} value={contact.id} style={{ color: '#333 !important', backgroundColor: 'white !important' }}>
                  {contact.name}
                </option>
              ))}
              <option value="__new__" style={{ color: '#333 !important', backgroundColor: 'white !important' }}>+ Add New Contact</option>
            </select>

          </div>

          <div className={styles.formGroup}>
            <label htmlFor="company_id">Company</label>
            <select
              id="company_id"
              name="company_id"
              value={formData.company_id}
              onChange={(e) => handleCompanyDropdownChange(e.target.value)}
              style={{
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
              {companies.map(company => (
                <option key={company.id} value={company.id} style={{ color: '#333', backgroundColor: 'white' }}>
                  {company.name}
                </option>
              ))}
              <option value="__new__" style={{ color: '#333', backgroundColor: 'white' }}>+ Add New Company</option>
            </select>

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
            >
              <option value="New">New</option>
              <option value="Qualify">Qualify</option>
              <option value="Proposal">Proposal</option>
              <option value="Review">Review</option>
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
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="service">Service</label>
            <select
              id="service"
              name="service"
              value={formData.service}
              onChange={handleChange}
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

            {formData.service === '__new__' && (
              <div className={styles.newItemForm}>
                <input
                  type="text"
                  placeholder="Service name"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newServiceAmount}
                  onChange={(e) => setNewServiceAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <div className={styles.newItemActions}>
                  <button
                    type="button"
                    onClick={handleCreateNewService}
                    disabled={creatingService}
                    className={styles.createButton}
                  >
                    {creatingService ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, service: '' }));
                      setNewServiceName('');
                      setNewServiceAmount('');
                    }}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
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
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="closing_date">Closing Date</label>
            <input
              type="date"
              id="closing_date"
              name="closing_date"
              value={formData.closing_date}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="source">Source</label>
            <select
              id="source"
              name="source"
              value={formData.source}
              onChange={handleChange}
            >
              <option value="">Select Source</option>
              {sources.map(source => (
                <option key={source.id} value={source.name}>
                  {source.name}
                </option>
              ))}
              <option value="__new__">+ Add New Source</option>
            </select>

            {formData.source === '__new__' && (
              <div className={styles.newItemForm}>
                <input
                  type="text"
                  placeholder="Source name"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                />
                <div className={styles.newItemActions}>
                  <button
                    type="button"
                    onClick={handleCreateNewSource}
                    disabled={creatingSource}
                    className={styles.createButton}
                  >
                    {creatingSource ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, source: '' }));
                      setNewSourceName('');
                    }}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
          />
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Lead'}
          </button>
        </div>
      </form>

      {/* Contact Creation Modal */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSuccess={handleContactCreated}
      />

      {/* Company Creation Modal */}
      <CompanyModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onSuccess={handleCompanyCreated}
      />
    </div>
  );
}