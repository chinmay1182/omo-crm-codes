"use client";

import { useState } from "react";
import ProductList from "@/app/components/Products/ProductList";
import QuotationList from "@/app/components/Quotations/QuotationList";
import styles from "./styles.module.css";

type TabType = "products" | "quotations";

export default function ProductsPage() {
    const [activeTab, setActiveTab] = useState<TabType>("products");

    return (
        <div className={styles.container}>
            <div className={styles.topNav}>
                <div className={styles.navTabsContainer}>
                    <button
                        className={`${styles.navTab} ${activeTab === "products" ? styles.activeTab : ""
                            }`}
                        onClick={() => setActiveTab("products")}
                    >
                        My Listed Products
                    </button>
                    <button
                        className={`${styles.navTab} ${activeTab === "quotations" ? styles.activeTab : ""
                            }`}
                        onClick={() => setActiveTab("quotations")}
                    >
                        Quotations
                    </button>
                </div>
            </div>

            <div className={styles.tabContent}>
                {activeTab === "products" && <ProductList />}
                {activeTab === "quotations" && <QuotationList />}
            </div>
        </div>
    );
}
