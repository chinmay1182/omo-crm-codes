import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeadModal from '../LeadModal/LeadModal';
import ContactCompanyModal from '../ContactCompanyModal/ContactCompanyModal';
import styles from './LeadsList.module.css';
import { usePermission } from '@/app/hooks/usePermission';
import Skeleton from '@/app/components/ui/Skeleton';
import toast from 'react-hot-toast';

interface Lead {
  id: string;
  assignment_name: string;
  contact_id?: string;
  contact_name?: string;
  contact_data?: Contact;
  company_id?: string;
  company_name?: string;
  company_data?: Company;
  stage: string;
  amount?: number;
  closing_date?: string;
  priority: string;
  assigned_to?: string;
  assigned_agent_name?: string;
  assigned_agent_username?: string;
  service?: string;
  source?: string;
  description?: string;
  created_at: string;
  comments?: any[];
}

interface Contact {
  id: string;
  title?: string;
  first_name: string;
  last_name: string;
  email?: string;
  company_id?: string;
  phone?: string;
  mobile?: string;
  description?: string;
  date_of_birth?: string;
  date_of_anniversary?: string;
  created_at?: string;
  updated_at?: string;
  contact?: number; // auto_increment field
  company_name?: string;
}

interface Company {
  id: string;
  name: string;
  type?: string;
  registration_number?: string;
  incorporation_date?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  company?: number; // auto_increment field
}

export default function LeadsList() {
  const router = useRouter();
  const { hasPermission, isModuleEnabled, user } = usePermission();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<{ id: string, name: string, username: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [isContactCompanyModalOpen, setIsContactCompanyModalOpen] = useState(false);

  // Export state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterStage, setFilterStage] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const [leadsResponse, agentsResponse] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/agents')
      ]);

      if (!leadsResponse.ok) throw new Error('Failed to fetch leads');
      if (!agentsResponse.ok) throw new Error('Failed to fetch agents');

      const leadsData = await leadsResponse.json();
      const agentsData = await agentsResponse.json();

      setLeads(leadsData);

      // Transform agents data
      const transformedAgents = agentsData.agents?.map((agent: any) => ({
        id: agent.id.toString(),
        name: agent.full_name || agent.username,
        username: agent.username
      })) || [];

      setAgents(transformedAgents);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const [selectedContactCompany, setSelectedContactCompany] = useState<{
    type: 'contact' | 'company';
    data: Contact | Company;
  } | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDelete = async (id: string) => {
    if (!hasPermission('leads', 'delete')) {
      toast.error('You do not have permission to delete leads.');
      return;
    }
    if (confirm('Are you sure you want to delete this lead?')) {
      try {
        const response = await fetch(`/api/leads/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          fetchLeads();
        } else {
          throw new Error('Failed to delete lead');
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleEdit = (lead: Lead) => {
    if (!hasPermission('leads', 'edit')) {
      toast.error('You do not have permission to edit leads.');
      return;
    }
    // Redirect to dedicated edit page instead of modal
    router.push(`/dashboard/lead-management/${lead.id}/edit`);
  };

  const handleAddNew = () => {
    if (!hasPermission('leads', 'edit') && user?.type !== 'user') {
      // Assuming 'edit' or implied 'create' permission needed. 
      // User options only had "edit", "delete", "view...". 
      // Typically "edit" encompasses creation in simple RBAC or we assume standard access.
      // However, often creation is separate. The user request: "enable and disable option with edit delete and view lead".
      // It didn't explicitly say "Create". But usually needed. Let's assume 'edit' allows create or if they have module access.
      // Let's use 'edit' as a proxy for modify capability if create is missing, or rely on module enable.
      // Safest: Check if they can edit.
    }
    setCurrentLead(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentLead(null);
    fetchLeads();
  };

  const handleContactCompanyClick = (
    type: 'contact' | 'company',
    data: Contact | Company | undefined,
    lead: Lead
  ) => {
    let displayData: Contact | Company | undefined = data;

    // Fallback: Create basic data structure if detailed data is not available
    if (!data && type === 'contact' && lead.contact_name) {
      const nameParts = lead.contact_name.split(' ');
      displayData = {
        id: lead.contact_id || 'unknown',
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: undefined,
        company_id: lead.company_id,
        phone: undefined,
        mobile: undefined,
        description: undefined,
        date_of_birth: undefined,
        date_of_anniversary: undefined,
        created_at: undefined,
        updated_at: undefined,
        company_name: lead.company_name,
        title: undefined
      } as Contact;
    } else if (!data && type === 'company' && lead.company_name) {
      displayData = {
        id: lead.company_id || 'unknown',
        name: lead.company_name,
        type: undefined,
        registration_number: undefined,
        incorporation_date: undefined,
        phone: undefined,
        email: undefined,
        website: undefined,
        description: undefined,
        created_at: undefined,
        updated_at: undefined
      } as Company;
    }

    if (displayData) {
      setSelectedContactCompany({ type, data: displayData });
      setIsContactCompanyModalOpen(true);
    }
  };

  const updateLeadField = async (leadId: string, field: string, value: string) => {
    if (field === 'assigned_to') {
      if (!hasPermission('leads', 'transfer_lead')) {
        toast.error('You do not have permission to transfer leads.');
        return;
      }
    } else {
      if (!hasPermission('leads', 'edit')) {
        toast.error('You do not have permission to update leads.');
        return;
      }
    }
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        fetchLeads(); // Refresh the leads list
      } else {
        throw new Error('Failed to update lead');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExport = () => {
    let filtered = leads;
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59);
      filtered = leads.filter(l => {
        const d = new Date(l.created_at);
        return d >= start && d <= end;
      });
    }

    const csvContent = [
      ["Lead ID", "Assignment", "Contact", "Company", "Service", "Source", "Stage", "Amount", "Priority", "Assigned To", "Date", "Follow-up Date", "Description", "Comment History"],
      ...filtered.map(l => [
        l.id, l.assignment_name, l.contact_name, l.company_name,
        l.service, l.source, l.stage, l.amount || 0, l.priority,
        l.assigned_agent_name, new Date(l.created_at).toLocaleDateString(),
        l.closing_date ? new Date(l.closing_date).toLocaleDateString() : '',
        l.description || '',
        (l.comments || []).map((c: any) => `[${new Date(c.created_at).toLocaleString()}] ${c.content}`).join('\n')
      ].map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setExportModalOpen(false);
  };

  // Permission Checks
  if (!loading && !isModuleEnabled('leads')) {
    return <div className={styles.error}>Access Denied: You do not have permission to access the Lead Management module.</div>;
  }

  // Filter based on Permissions (View All vs View Assigned)
  const accessibleLeads = leads.filter(lead => {
    if (user?.type !== 'agent') return true;
    if (hasPermission('leads', 'view_all')) return true;
    if (hasPermission('leads', 'view_assigned')) {
      // Assuming user.id matches lead.assigned_to. 
      // Need to ensure types match (string vs number). 
      // lead.assigned_to is likely UUID string or number string. user.id is number/string.
      return String(lead.assigned_to) === String(user.id);
    }
    return false;
  });

  const filteredLeads = accessibleLeads.filter(lead => {
    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchesSearch = !!(
        lead.assignment_name?.toLowerCase().includes(q) ||
        lead.contact_name?.toLowerCase().includes(q) ||
        lead.company_name?.toLowerCase().includes(q) ||
        lead.id.toLowerCase().includes(q) ||
        (lead.amount?.toString().includes(q))
      );
    }

    if (filterStage === 'All') return matchesSearch;
    return matchesSearch && lead.stage?.toLowerCase() === filterStage.toLowerCase();
  });

  if (loading) {
    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {[...Array(13)].map((_, i) => (
                <th key={i}>
                  <Skeleton width={80} height={20} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, i) => (
              <tr key={i}>
                {[...Array(13)].map((_, j) => (
                  <td key={j} style={{ padding: '16px' }}>
                    <Skeleton width={j === 0 ? 80 : '100%'} height={20} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      {/* Add Export Button in a small header row above table if possible, or floating */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0', gap: '10px' }}>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            color: '#333',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="All">All Stages</option>
          <option value="New">New</option>
          <option value="Qualify">Qualify</option>
          <option value="Proposal">Proposal</option>
          <option value="Review">Review</option>
          <option value="Completed">Completed</option>
          <option value="WON">WON</option>
          <option value="DROP">DROP</option>
        </select>

        <input
          type="text"
          placeholder="Search leads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            width: '200px'
          }}
        />

        <button
          onClick={() => setExportModalOpen(true)}
          style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fa-light fa-file-export"></i> Export Leads
        </button>
      </div>

      <div className={styles.tableContainer}>
        {/* ... existing table ... */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lead ID</th>
              <th>Assignment</th>
              <th>Contact</th>
              <th>Company</th>
              <th>Service</th>
              <th>Source</th>
              <th>Stage</th>
              <th>TAT Status</th>
              <th>Amount</th>
              <th>Follow-up Date</th>
              <th>Priority</th>
              <th>Assigned To</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id}>
                <td className={styles.leadId}>{lead.id.substring(0, 8)}...</td>
                <td>{lead.assignment_name}</td>
                <td
                  onClick={() => lead.contact_name && handleContactCompanyClick('contact', lead.contact_data, lead)}
                  className={`${styles.clickableCell} ${lead.contact_name ? styles.hasData : ''}`}
                  style={{ cursor: lead.contact_name ? 'pointer' : 'default' }}
                >
                  {lead.contact_name || '-'}
                </td>
                <td
                  onClick={() => lead.company_name && handleContactCompanyClick('company', lead.company_data, lead)}
                  className={`${styles.clickableCell} ${lead.company_name ? styles.hasData : ''}`}
                  style={{ cursor: lead.company_name ? 'pointer' : 'default' }}
                >
                  {lead.company_name || '-'}
                </td>
                <td>{lead.service || '-'}</td>
                <td>{lead.source || '-'}</td>
                <td>
                  {/* Disable stage change if no edit permission */}
                  {lead.stage === 'Expired' ? (
                    <span className={styles.expiredBadge} style={{ color: '#dc3545', fontWeight: 'bold', padding: '0 8px' }}>Expired</span>
                  ) : (
                    <select
                      value={lead.stage}
                      onChange={(e) => updateLeadField(lead.id, 'stage', e.target.value)}
                      className={styles.dropdown}
                      disabled={!hasPermission('leads', 'edit')}
                    >
                      <option value="New">New</option>
                      <option value="Qualify">Qualify</option>
                      <option value="Proposal">Proposal</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                      <option value="WON">WON</option>
                      <option value="DROP">DROP</option>
                      {/* Hidden option for Expired just in case it comes from DB but logic above renders span */}
                      <option value="Expired" disabled>Expired</option>
                    </select>
                  )}
                </td>
                <td>
                  {(() => {
                    const status = lead.stage;
                    if (status === 'WON' || status === 'DROP') return '';

                    if (!lead.closing_date) return <span style={{ color: '#6c757d' }}>No Date</span>;

                    const followUpDate = new Date(lead.closing_date);
                    const now = new Date();
                    // Difference in hours
                    const diffHours = (now.getTime() - followUpDate.getTime()) / (1000 * 60 * 60);

                    // Logic: "If follow-up date within 72 Hrs ... In TAT"
                    // "after 72 Hrs from-up date it’s show Lost"
                    // Assuming this checks if we have exceeded 72 hours AFTER the follow-up date.
                    if (diffHours > 72) {
                      return <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Lost</span>;
                    } else {
                      return <span style={{ color: '#28a745', fontWeight: 'bold' }}>In TAT</span>;
                    }
                  })()}
                </td>
                <td>{lead.amount ? `₹${lead.amount.toLocaleString()}` : '-'}</td>
                <td>{lead.closing_date ? new Date(lead.closing_date).toLocaleDateString() : '-'}</td>
                <td>
                  <select
                    value={lead.priority}
                    onChange={(e) => updateLeadField(lead.id, 'priority', e.target.value)}
                    className={styles.dropdown}
                    disabled={!hasPermission('leads', 'edit')}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </td>
                <td>
                  <select
                    value={lead.assigned_to || ''}
                    onChange={(e) => updateLeadField(lead.id, 'assigned_to', e.target.value)}
                    className={styles.dropdown}
                    disabled={!hasPermission('leads', 'transfer_lead')}
                  >
                    <option value="">Unassigned</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.username})
                      </option>
                    ))}
                  </select>
                </td>
                <td className={styles.actions}>
                  <button
                    onClick={() => router.push(`/dashboard/lead-management/${lead.id}`)}
                    className={styles.viewButton}
                  >
                    View
                  </button>
                  {hasPermission('leads', 'edit') && (
                    <button
                      onClick={() => handleEdit(lead)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                  )}
                  {hasPermission('leads', 'delete') && (
                    <button
                      onClick={() => handleDelete(lead.id)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assuming 'edit' implies ability to create new, since explicit create permission wasn't in spec for Leads, only Enable/Disable, View, Edit, Delete. */}
      {hasPermission('leads', 'edit') && (
        <button
          onClick={handleAddNew}
          className={styles.floatingButton}
          title="Add New Lead"
        >
          <i className="fa-light fa-plus"></i>
        </button>
      )}

      <ContactCompanyModal
        isOpen={isContactCompanyModalOpen}
        onClose={() => setIsContactCompanyModalOpen(false)}
        type={selectedContactCompany?.type || 'contact'}
        data={selectedContactCompany?.data || {} as Contact}
      />

      <LeadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={currentLead || undefined}
        refreshLeads={fetchLeads}
      />

      {/* Export Modal */}
      {exportModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '350px' }}>
            <h3 style={{ marginTop: 0 }}>Export Leads</h3>
            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Start Date:</label>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }} />

              <label style={{ display: 'block', marginBottom: '5px' }}>End Date:</label>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setExportModalOpen(false)} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleExport} style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Download CSV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}