"use client";

import { useState, useEffect } from "react";
import styles from "./ProposalModal.module.css";

interface Lead {
  id: string;
  reference_id?: string;
  assignment_name: string;
  contact_name?: string;
  company_name?: string;
  stage: string;
  amount?: number;
}

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
  | "drop"
  | "partial"
  | "expired";
  amount?: number;
  partial_amount?: number;
  order_id?: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
  description?: string;
}

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Proposal;
  refreshProposals: () => void;
}

export default function ProposalModal({
  isOpen,
  onClose,
  initialData,
  refreshProposals,
}: ProposalModalProps) {
  const [formData, setFormData] = useState<{
    lead_id: string;
    proposal_to: string;
    amount: string;
    proposal_status: "created" | "accepted" | "hold" | "drop" | "partial" | "expired";
    description: string;
    validity_days: string;
    order_id: string;
    discount: string;
  }>({
    lead_id: "",
    proposal_to: "",
    amount: "",
    proposal_status: "created",
    description: "",
    validity_days: "7",
    order_id: "",
    discount: "",
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [leadSearch, setLeadSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
      if (initialData) {
        setFormData({
          lead_id: initialData.lead_id,
          proposal_to: initialData.proposal_to,
          amount: initialData.amount?.toString() || "",
          proposal_status: initialData.proposal_status,
          description: initialData.description || "",
          validity_days: initialData.expiry_date && initialData.proposal_date
            ? Math.round((new Date(initialData.expiry_date).getTime() - new Date(initialData.proposal_date).getTime()) / (1000 * 3600 * 24)).toString()
            : "7",
          order_id: initialData.order_id || "",
          discount: (initialData as any).discount?.toString() || "",
        });
      } else {
        setFormData({
          lead_id: "",
          proposal_to: "",
          amount: "",
          proposal_status: "created",
          description: "",
          validity_days: "7",
          order_id: "",
          discount: "",
        });
      }
    }
  }, [isOpen, initialData]);

  const fetchLeads = async () => {
    try {
      const response = await fetch("/api/leads");
      if (response.ok) {
        const data = await response.json();

        // Show only leads in 'Proposal' stage as per request
        const proposalLeads = data.filter((l: any) => l.stage?.toLowerCase() === 'proposal');
        setLeads(proposalLeads);
      } else {
        console.error("Failed to fetch leads:", response.status);
        setLeads([]);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
      setLeads([]);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = initialData
        ? `/api/proposals/${initialData.id}`
        : "/api/proposals";
      const method = initialData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          discount: formData.discount ? parseFloat(formData.discount) : 0,
        }),
      });

      if (response.ok) {
        refreshProposals();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save proposal");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLeadChange = (leadId: string) => {
    const selectedLead = leads.find((lead) => lead.id === leadId);
    if (selectedLead) {
      setFormData((prev) => ({
        ...prev,
        lead_id: leadId,
        proposal_to:
          selectedLead.contact_name || selectedLead.company_name || "",
        amount: selectedLead.amount?.toString() || "",
      }));
    }
  };

  if (!isOpen) return null;

  const filteredLeads = leads.filter(lead => {
    if (!leadSearch) return true;
    const search = leadSearch.toLowerCase();
    const text = `${lead.assignment_name} ${lead.contact_name || ''} ${lead.company_name || ''} ${lead.reference_id || ''} ${lead.id}`.toLowerCase();
    return text.includes(search);
  });

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{initialData ? "Edit Proposal" : "Create New Proposal"}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fa-light fa-times"></i>
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="lead_id">Select Lead *</label>

            <input
              type="text"
              placeholder="Search lead by Name or Reference ID..."
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              style={{ marginBottom: '8px', padding: '8px', width: '100%', border: '1px solid #ddd', borderRadius: '4px' }}
            />

            <select
              id="lead_id"
              value={formData.lead_id}
              onChange={(e) => handleLeadChange(e.target.value)}
              required
              disabled={loading || !!initialData}
            >
              <option value="">Select a lead...</option>
              {filteredLeads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.assignment_name} -{" "}
                  {lead.contact_name ||
                    lead.company_name ||
                    "No contact/company"}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="proposal_to">Proposal To *</label>
            <input
              type="text"
              id="proposal_to"
              value={formData.proposal_to}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  proposal_to: e.target.value,
                }))
              }
              required
              disabled={loading}
              placeholder="Enter recipient name"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="amount">Proposal Amount</label>
            <input
              type="number"
              id="amount"
              value={formData.amount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, amount: e.target.value }))
              }
              disabled={loading}
              placeholder="Enter proposal amount"
              min="0"
              step="0.01"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="discount">Other Associated Expenses (₹)</label>
            <input
              type="number"
              id="discount"
              value={formData.discount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, discount: e.target.value }))
              }
              disabled={loading}
              placeholder="Enter discount amount"
              min="0"
              step="0.01"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="validity_days">Validity (Days)</label>
            <input
              type="number"
              id="validity_days"
              value={formData.validity_days}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, validity_days: e.target.value }))
              }
              disabled={loading || !!initialData}
              placeholder="Enter validity in days"
              min="1"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="proposal_status">Status</label>
            <select
              id="proposal_status"
              value={formData.proposal_status}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  proposal_status: e.target.value as any,
                }))
              }
              disabled={loading}
            >
              <option value="created">Created</option>
              <option value="hold">Hold</option>
              <option value="accepted">Accepted</option>

              <option value="drop">Drop</option>

            </select>
          </div>

          {(formData.proposal_status === 'accepted' || formData.proposal_status === 'partial') && (
            <div className={styles.formGroup}>
              <label htmlFor="order_id">Order ID *</label>
              <input
                type="text"
                id="order_id"
                value={formData.order_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    order_id: e.target.value,
                  }))
                }
                required
                disabled={loading}
                placeholder="Enter Order ID"
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              disabled={loading}
              placeholder="Enter proposal description (optional)"
              rows={4}
            />
          </div>
          <div className={styles.modalActions}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : initialData
                  ? "Update Proposal"
                  : "Create Proposal"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
