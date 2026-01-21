"use client";

import { useState } from "react";
import LeadsList from "@/app/components/LeadsList/LeadList";
import styles from "./styles.module.css";

// Dynamic import to avoid module resolution issues
import dynamic from "next/dynamic";
const ProposalsList = dynamic(
  () => import("@/app/components/ProposalsList/ProposalsList"),
  {
    loading: () => <div>Loading proposals...</div>,
  }
);

type TabType = "leads" | "proposals";

export default function LeadManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>("leads");

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lead Management</h1>
          <p className={styles.leadPara}>
            Track, update, and manage all your leads in one place
          </p>
        </div>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "leads" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("leads")}
          >
            <i
              className="fa-light fa-user-plus"
              style={{ marginRight: "8px" }}
            ></i>
            Leads
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "proposals" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("proposals")}
          >
            <i
              className="fa-light fa-file-contract"
              style={{ marginRight: "8px" }}
            ></i>
            Proposals
          </button>
        </div>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "leads" && <LeadsList />}
        {activeTab === "proposals" && <ProposalsList />}
      </div>
    </div>
  );
}
