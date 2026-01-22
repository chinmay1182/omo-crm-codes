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
      <div className={styles.topNav}>
        <div className={styles.navTabsContainer}>
          <button
            className={`${styles.navTab} ${activeTab === "leads" ? styles.activeTab : ""
              }`}
            onClick={() => setActiveTab("leads")}
          >
            Leads
          </button>
          <button
            className={`${styles.navTab} ${activeTab === "proposals" ? styles.activeTab : ""
              }`}
            onClick={() => setActiveTab("proposals")}
          >
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
