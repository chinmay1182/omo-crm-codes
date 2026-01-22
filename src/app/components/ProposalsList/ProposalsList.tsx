"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProposalModal from "../ProposalModal/ProposalModal";
import styles from "./ProposalsList.module.css";
import toast from 'react-hot-toast';
import { usePermission } from "@/app/hooks/usePermission";

interface Proposal {
  id: string;
  proposal_number: string;
  lead_id: string;
  lead_reference_number: string;
  proposal_to: string;
  contact_name?: string;
  company_name?: string;
  proposal_date: string;
  proposal_status:
  | "created"
  | "accepted"
  | "hold"
  | "partial"
  | "drop"
  | "expired";
  amount?: number;
  partial_amount?: number;
  order_id?: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export default function ProposalsList() {
  const router = useRouter();
  const { hasPermission, user } = usePermission();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusData, setStatusData] = useState<{
    id: string;
    status: string;
    amount?: number;
  } | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [orderId, setOrderId] = useState('');

  // Export state
  // Export state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProposals = async () => {
    // ... existing fetchProposals ...
    try {
      setLoading(true);
      const response = await fetch("/api/proposals");

      if (!response.ok) throw new Error("Failed to fetch proposals");

      const data = await response.json();
      setProposals(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching proposals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  // ... handleDelete ...

  const handleDelete = async (id: string) => {
    if (!hasPermission('leads', 'proposal_delete')) {
      toast.error('You do not have permission to delete proposals');
      return;
    }
    if (confirm("Are you sure you want to delete this proposal?")) {
      try {
        const response = await fetch(`/api/proposals/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          fetchProposals();
        } else {
          throw new Error("Failed to delete proposal");
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleEdit = (proposal: Proposal) => {
    if (!hasPermission('leads', 'proposal_edit')) {
      toast.error('You do not have permission to edit proposals');
      return;
    }
    setCurrentProposal(proposal);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    if (!hasPermission('leads', 'proposal_create')) {
      toast.error('You do not have permission to create proposals');
      return;
    }
    setCurrentProposal(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentProposal(null);
    fetchProposals();
  };

  const handleStatusChange = (proposal: Proposal, newStatus: string) => {
    if (!hasPermission('leads', 'proposal_edit')) {
      toast.error('You do not have permission to update proposal status');
      return;
    }
    if (newStatus === 'accepted' || newStatus === 'partial') {
      setStatusData({ id: proposal.id, status: newStatus, amount: proposal.amount });
      setPaymentType(newStatus === 'partial' ? 'partial' : 'full');
      setPaymentAmount(proposal.amount ? proposal.amount.toString() : '');
      setOrderId('');
      setStatusModalOpen(true);
    } else {
      updateProposalStatus(proposal.id, newStatus);
    }
  };

  const updateProposalStatus = async (proposalId: string, status: string, partialAmount?: number) => {
    try {
      const payload: any = { proposal_status: status };
      if (partialAmount !== undefined) {
        payload.partial_amount = partialAmount;
      }
      if (status === 'accepted') {
        // @ts-ignore
        payload.order_id = orderId;
      }

      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchProposals();
        setStatusModalOpen(false);
        setStatusData(null);
      } else {
        throw new Error("Failed to update proposal status");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStatusConfirm = () => {
    if (!orderId.trim()) {
      toast.error("Order ID is required");
      return;
    }

    if (statusData) {
      const finalAmount = parseFloat(paymentAmount);

      if (paymentType === 'partial' && statusData.amount && finalAmount >= statusData.amount) {
        toast.error(`Partial amount must be less than total amount (₹${statusData.amount})`);
        return;
      }

      // Always set status to accepted, even for partial payments
      const finalStatus = 'accepted';

      if (paymentType === 'partial') {
        updateProposalStatus(statusData.id, finalStatus, finalAmount);
      } else {
        // Clear partial amount if full payment
        updateProposalStatus(statusData.id, finalStatus, null as any);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "created":
        return "#17a2b8";
      case "accepted":
        return "#28a745";
      case "partial":
        return "#ffc107";
      case "hold":
        return "#6c757d";
      case "drop":
        return "#dc3545";
      case "expired":
        return "#6f42c1";
      default:
        return "#6c757d";
    }
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const handleView = (proposal: Proposal) => {
    window.open(`/api/proposals/${proposal.id}/view`, "_blank");
  };

  const handleDownload = (proposal: Proposal) => {
    window.open(`/api/proposals/${proposal.id}/download`, "_blank");
  };

  const handleExport = () => {
    // Generate CSV from current proposals filtered by date if set
    let filtered = proposals;
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59);
      filtered = proposals.filter(p => {
        const d = new Date(p.created_at);
        return d >= start && d <= end;
      });
    }

    const csvContent = [
      ["Proposal ID", "Lead Ref", "Contact Name", "Company Name", "Proposal To", "Proposal Date", "Status", "Total Amount", "Approved Amount", "Partial Amount", "Order ID", "Expiry Date", "Last Updated"],
      ...filtered.map(p => [
        p.proposal_number,
        p.lead_reference_number,
        p.contact_name,
        p.company_name,
        p.proposal_to,
        new Date(p.proposal_date).toLocaleDateString(),
        p.proposal_status,
        p.amount || 0,
        // Approved Amount: show amount ONLY if status is accepted AND no partial amount (Full Approved)
        (p.proposal_status === 'accepted' && !p.partial_amount) ? p.amount : 0,
        // Partial Amount: show only if accepted
        (p.proposal_status === 'accepted' && p.partial_amount) ? p.partial_amount : 0,
        p.order_id || '',
        new Date(p.expiry_date).toLocaleDateString(),
        // Last Updated with Time
        new Date(p.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      ].map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposals_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setExportModalOpen(false);
  };

  const filteredProposals = proposals.filter(proposal => {
    let matchesStatus = true;
    if (filterStatus !== 'All') {
      matchesStatus = proposal.proposal_status?.toLowerCase() === filterStatus.toLowerCase();
    }

    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchesSearch = !!(
        proposal.proposal_number?.toLowerCase().includes(q) ||
        proposal.lead_reference_number?.toLowerCase().includes(q) ||
        proposal.proposal_to?.toLowerCase().includes(q) ||
        proposal.id?.toLowerCase().includes(q) ||
        (proposal.amount?.toString().includes(q))
      );
    }

    return matchesStatus && matchesSearch;
  });

  if (loading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading Proposals...</p>
      </div>
    );
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.topNav}>
        <input
          type="text"
          placeholder="Search proposals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          style={{
            padding: '6px 12px',
            border: 'none',
            borderBottom: '1px solid #e0e0e0',
            borderRadius: 0,
            width: '200px',
            fontSize: '14px',
            fontFamily: 'Open Sauce One, sans-serif',
            outline: 'none',
            transition: 'all 0.2s'
          }}
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="All">All Status</option>
          <option value="created">Created</option>
          <option value="accepted">Accepted</option>
          <option value="hold">Hold</option>
          <option value="drop">Drop</option>
          <option value="expired">Expired</option>
        </select>

        <button
          onClick={() => setExportModalOpen(true)}
          className={styles.tagsButton}
          title="Export Proposals"
        >
          <i className="fa-sharp fa-thin fa-file-export"></i>
          <span>Export</span>
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Proposal ID</th>
              <th>Lead Reference</th>
              <th>Proposal To</th>
              <th>Proposal Date</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Partial Approved</th>
              <th>Full Approved</th>
              <th>Expiry Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProposals.map((proposal) => (
              <tr
                key={proposal.id}
                className={
                  isExpired(proposal.expiry_date) &&
                    proposal.proposal_status !== "expired" &&
                    proposal.proposal_status !== "accepted" &&
                    proposal.proposal_status !== "drop"
                    ? styles.expiredRow
                    : ""
                }
              >
                <td data-label="Proposal ID" className={styles.proposalId}>
                  {proposal.proposal_number}
                </td>
                <td data-label="Lead Reference" className={styles.leadRef}>
                  {proposal.lead_reference_number}
                </td>
                <td data-label="Proposal To">{proposal.proposal_to}</td>
                <td data-label="Proposal Date">{new Date(proposal.proposal_date).toLocaleDateString()}</td>
                <td data-label="Status">
                  {proposal.proposal_status === 'expired' ? (
                    <span className={styles.expiredBadge}>EXPIRED</span>
                  ) : (
                    <select
                      value={proposal.proposal_status}
                      onChange={(e) =>
                        handleStatusChange(proposal, e.target.value)
                      }
                      className={styles.dropdown}
                      disabled={!hasPermission('leads', 'proposal_edit')}
                    >
                      <option value="created">Created</option>
                      <option value="hold">Hold</option>
                      <option value="accepted">Accepted</option>
                      <option value="drop">Drop</option>
                      <option value="expired" disabled>Expired</option>
                    </select>
                  )}
                </td>
                <td data-label="Amount">
                  {proposal.amount
                    ? `₹${proposal.amount.toLocaleString()}`
                    : "-"}
                </td>
                <td data-label="Partial Approved">
                  {proposal.proposal_status === "accepted" && proposal.partial_amount
                    ? `₹${proposal.partial_amount.toLocaleString()}`
                    : "-"}
                </td>
                <td data-label="Full Approved">
                  {proposal.proposal_status === "accepted" && !proposal.partial_amount
                    ? `₹${(proposal.amount || 0).toLocaleString()}`
                    : "-"}
                </td>
                <td
                  data-label="Expiry Date"
                  className={
                    isExpired(proposal.expiry_date) ? styles.expiredDate : ""
                  }
                >
                  {new Date(proposal.expiry_date).toLocaleDateString()}
                  {isExpired(proposal.expiry_date) &&
                    proposal.proposal_status !== "expired" &&
                    proposal.proposal_status !== "accepted" &&
                    proposal.proposal_status !== "drop" && (
                      <span className={styles.expiredBadge}>EXPIRED</span>
                    )}
                </td>
                <td className={styles.actions} data-label="Actions">
                  <button
                    onClick={() => handleView(proposal)}
                    className={styles.viewButton}
                    title="View Proposal"
                  >
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleDownload(proposal)}
                    className={styles.downloadButton}
                    title="Download Proposal"
                  >
                    <span>Download</span>
                  </button>
                  {hasPermission('leads', 'proposal_edit') && (
                    <button
                      onClick={() => handleEdit(proposal)}
                      className={styles.editButton}
                      title="Edit Proposal"
                    >
                      <span>Edit</span>
                    </button>
                  )}
                  {hasPermission('leads', 'proposal_delete') && (
                    <button
                      onClick={() => handleDelete(proposal.id)}
                      className={styles.deleteButton}
                      title="Delete Proposal"
                    >
                      <span>Delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {proposals.length === 0 && (
          <div className={styles.emptyState}>
            <i
              className="fa-light fa-file-contract"
              style={{
                fontSize: "3rem",
                color: "#dee2e6",
                marginBottom: "1rem",
              }}
            ></i>
            <h3>No Proposals Found</h3>
            <p>Create your first proposal to get started</p>
          </div>
        )}
      </div>

      {hasPermission('leads', 'proposal_create') && (
        <button
          onClick={handleAddNew}
          className={styles.floatingButton}
          title="Add New Proposal"
        >
          <i className="fa-light fa-plus"></i>
        </button>
      )}

      <ProposalModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={currentProposal || undefined}
        refreshProposals={fetchProposals}
      />

      {/* Status Confirmation Modal */}
      {statusModalOpen && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className={styles.modalContent} style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '400px' }}>
            <h3>{statusData?.status === 'partial' ? 'Partial Approval' : 'Accept Proposal'}</h3>
            <p>Is this a Full or Partial approval?</p>
            <div style={{ margin: '15px 0' }}>
              <label style={{ marginRight: '15px' }}>
                <input
                  type="radio"
                  name="paymentType"
                  value="full"
                  checked={paymentType === 'full'}
                  onChange={() => {
                    setPaymentType('full');
                    setPaymentAmount(statusData?.amount?.toString() || '');
                  }}
                /> Full
              </label>
              <label>
                <input
                  type="radio"
                  name="paymentType"
                  value="partial"
                  checked={paymentType === 'partial'}
                  onChange={() => setPaymentType('partial')}
                /> Partial
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Amount Received</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={paymentType === 'full'}
                style={{ width: '100%', padding: '8px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Order ID <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter Order ID"
                style={{ width: '100%', padding: '8px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setStatusModalOpen(false)} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleStatusConfirm} style={{ padding: '8px 16px', background: '#0069ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className={styles.modalContent} style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '350px' }}>
            <h3>Export Proposals</h3>
            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Start Date:</label>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />

              <label style={{ display: 'block', marginBottom: '5px' }}>End Date:</label>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} style={{ width: '100%', padding: '8px' }} />
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
