"use client";

import React, { useState, useEffect } from "react";
import styles from "./styles.module.css";

import toast from "react-hot-toast";
import ServiceModal from "@/app/components/ServiceModal/ServiceModal";
import InclusionExclusionModal from "@/app/components/InclusionExclusionModal/InclusionExclusionModal";
import ServiceSettingsModal from "@/app/components/ServiceSettingsModal/ServiceSettingsModal";

interface Service {
  id: string;
  service_code: string;
  unique_service_code: string;
  service_name: string;
  service_names: string[];
  service_categories: string[];
  service_type: "pre_engagement" | "post_engagement";
  service_tat: number | string; // TAT in days (can be number or string from API)
  service_fee: number;
  professional_fee: number;
  discount: number;
  challan_associated: string;
  gst_amount: number;
  total_amount: number;
  inclusions: string[];
  exclusions: string[];
  created_at: string;
}

interface ServiceTag {
  id: string;
  name: string;
  type: "service_name" | "service_category";
}

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceTags, setServiceTags] = useState<ServiceTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showInclusionModal, setShowInclusionModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedServiceForInclusion, setSelectedServiceForInclusion] =
    useState<string | null>(null);
  const [hoveredService, setHoveredService] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "pre_engagement" | "post_engagement"
  >("all");

  useEffect(() => {
    fetchServices();
    fetchServiceTags();
  }, []);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/services");
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        toast.error("Failed to fetch services");
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to fetch services");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServiceTags = async () => {
    try {
      const response = await fetch("/api/service-tags");
      if (response.ok) {
        const data = await response.json();
        setServiceTags(data);
      }
    } catch (error) {
      console.error("Error fetching service tags:", error);
    }
  };

  const handleServiceCreated = () => {
    fetchServices();
    setShowServiceModal(false);
    setEditingService(null);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setShowServiceModal(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setServices(services.filter((s) => s.id !== serviceId));
        toast.success("Service deleted successfully");
      } else {
        toast.error("Failed to delete service");
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    }
  };

  const handleInclusionExclusionUpdate = () => {
    fetchServices();
    setShowInclusionModal(false);
    setSelectedServiceForInclusion(null);
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      searchQuery === "" ||
      service.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.service_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.unique_service_code
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterType === "all" || service.service_type === filterType;

    return matchesSearch && matchesFilter;
  });

  // if (isLoading) {
  //   return (
  //     <div className={styles.loadingContainer}>
  //       <div className={styles.loadingSpinner}></div>
  //     </div>
  //   );
  // }

  return (
    <div className={styles.servicesContainer}>
      <div className={styles.topNav}>


        {/* Search - Moved out to separate it from right actions */}
        <div className={styles.searchWrapper}>
          <i className={`fa-sharp fa-thin fa-search ${styles.searchIcon}`}></i>
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.topActions}>
          {/* Filter */}
          <div className={styles.filterWrapper}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className={styles.filterSelect}
              style={{ paddingLeft: '0' }}
            >
              <option value="all">All Types</option>
              <option value="pre_engagement">Pre Engagement</option>
              <option value="post_engagement">Post Engagement</option>
            </select>
          </div>

          <button
            onClick={() => {
              const csvContent = [
                [
                  "Service Code",
                  "Unique Code",
                  "Service Names",
                  "Categories",
                  "Service Type",
                  "TAT",
                  "Service Fee",
                  "Professional Fee",
                  "Discount",
                  "GST",
                  "Total Amount",
                  "Challan",
                  "Inclusions",
                  "Exclusions"
                ],
                ...filteredServices.map(s => [
                  s.service_code,
                  s.unique_service_code,
                  s.service_names.join('; '),
                  s.service_categories.join('; '),
                  s.service_type,
                  s.service_tat,
                  s.service_fee,
                  s.professional_fee,
                  s.discount,
                  s.gst_amount,
                  s.total_amount,
                  s.challan_associated,
                  (s.inclusions || []).join('; '),
                  (s.exclusions || []).join('; ')
                ].map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(","))
              ].join("\n");

              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `services_export_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            className={styles.tagsButton}
            title="Export to CSV"
          >
            <i className="fa-sharp fa-thin fa-file-export"></i>
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className={styles.tagsButton}
            title="Service Settings"
          >
            <i className="fa-sharp fa-thin fa-filter-list"></i>
            <span>Manage Services</span>
          </button>
        </div>
      </div>



      <div className={styles.tableContainer}>
        <table className={styles.servicesTable}>
          <thead>
            <tr>
              <th>Service Code</th>
              <th>Unique Code</th>
              <th>Service Names</th>
              <th>Categories</th>
              <th>Service Type</th>
              <th>TAT</th>
              <th>Service Fee</th>
              <th>Professional Fee</th>
              <th>Discount</th>
              <th>GST (18%)</th>
              <th>Total Amount</th>
              <th>Challan</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.length > 0 ? (
              filteredServices.map((service) => (
                <tr
                  key={service.id}
                  className={styles.serviceRow}
                  onMouseEnter={() => setHoveredService(service.id)}
                  onMouseLeave={() => setHoveredService(null)}
                >
                  <td data-label="Service Code">{service.service_code}</td>
                  <td data-label="Unique Code">{service.unique_service_code}</td>
                  <td data-label="Service Names">
                    <div className={styles.tagsContainer}>
                      {service.service_names &&
                        Array.isArray(service.service_names) &&
                        service.service_names.length > 0 ? (
                        service.service_names.map((name, index) => (
                          <span key={index} className={styles.serviceTag}>
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className={styles.noTags}>-</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Categories">
                    <div className={styles.tagsContainer}>
                      {service.service_categories &&
                        Array.isArray(service.service_categories) &&
                        service.service_categories.length > 0 ? (
                        service.service_categories.map((category, index) => (
                          <span key={index} className={styles.categoryTag}>
                            {category}
                          </span>
                        ))
                      ) : (
                        <span className={styles.noTags}>-</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Service Type">
                    {service.service_type === 'pre_engagement' ? 'Pre Engagement' :
                      service.service_type === 'post_engagement' ? 'Post Engagement' : service.service_type}
                  </td>
                  <td data-label="TAT">{service.service_tat} days</td>
                  <td data-label="Service Fee">₹{(Number(service.service_fee) || 0).toFixed(2)}</td>
                  <td data-label="Professional Fee">
                    ₹{(Number(service.professional_fee) || 0).toFixed(2)}
                  </td>
                  <td data-label="Discount">₹{(Number(service.discount) || 0).toFixed(2)}</td>
                  <td data-label="GST (18%)">₹{(Number(service.gst_amount) || 0).toFixed(2)}</td>
                  <td data-label="Total Amount" className={styles.totalAmount}>
                    ₹{(Number(service.total_amount) || 0).toFixed(2)}
                  </td>
                  <td data-label="Challan">{service.challan_associated}</td>
                  <td data-label="Actions">
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => {
                          setSelectedServiceForInclusion(service.id);
                          setShowInclusionModal(true);
                        }}
                        className={styles.infoButton}
                        title="Inclusions & Exclusions"
                      >
                        <span>Info</span>
                      </button>
                      <button
                        onClick={() => handleEditService(service)}
                        className={styles.editButton}
                        title="Edit Service"
                      >
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className={styles.deleteButton}
                        title="Delete Service"
                      >
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={12} className={styles.noResults}>
                  No services found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={() => setShowServiceModal(true)}
        className={styles.floatingButton}
        title="Add New Service"
      >
        <i className="fa-light fa-plus"></i>
      </button>
      {hoveredService && (
        <div className={styles.serviceTooltip}>
          {(() => {
            const service = services.find((s) => s.id === hoveredService);
            if (!service) return null;

            return (
              <div className={styles.tooltipContent}>
                <h4>Inclusions & Exclusions</h4>
                {service.inclusions.length > 0 && (
                  <div className={styles.tooltipSection}>
                    <strong>Inclusions:</strong>
                    <ul>
                      {service.inclusions.map((inclusion, index) => (
                        <li key={index}>{inclusion}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {service.exclusions.length > 0 && (
                  <div className={styles.tooltipSection}>
                    <strong>Exclusions:</strong>
                    <ul>
                      {service.exclusions.map((exclusion, index) => (
                        <li key={index}>{exclusion}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {service.inclusions.length === 0 &&
                  service.exclusions.length === 0 && (
                    <p>No inclusions or exclusions defined</p>
                  )}
              </div>
            );
          })()}
        </div>
      )}

      {showServiceModal && (
        <ServiceModal
          isOpen={showServiceModal}
          onClose={() => {
            setShowServiceModal(false);
            setEditingService(null);
          }}
          onSuccess={handleServiceCreated}
          service={editingService}
          serviceTags={serviceTags}
        />
      )}

      {showInclusionModal && selectedServiceForInclusion && (
        <InclusionExclusionModal
          isOpen={showInclusionModal}
          onClose={() => {
            setShowInclusionModal(false);
            setSelectedServiceForInclusion(null);
          }}
          onSuccess={handleInclusionExclusionUpdate}
          serviceId={selectedServiceForInclusion}
        />
      )}

      {showSettingsModal && (
        <ServiceSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSuccess={() => {
            fetchServiceTags();
          }}
          serviceTags={serviceTags}
        />
      )}
    </div>
  );
};

export default ServicesPage;
