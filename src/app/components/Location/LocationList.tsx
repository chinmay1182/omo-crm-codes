'use client';

import { useState, useEffect } from 'react';
import styles from './locationlist.module.css';
import Skeleton from '../ui/Skeleton';
import dynamic from 'next/dynamic';

// Dynamically import Map to avoid SSR issues
const MapWithNoSSR = dynamic(() => import('./Map'), { ssr: false });

interface CompanyLocation {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string | null;
    country: string;
    postal_code: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
}

interface LocationListProps {
    companyId?: string;
    contactId?: string;
}

export default function LocationList({ companyId, contactId }: LocationListProps) {
    const [locations, setLocations] = useState<CompanyLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                setLoading(true);
                let url = '';

                if (companyId) {
                    url = `/api/companies/locations?companyId=${companyId}`;
                } else if (contactId) {
                    url = `/api/contacts/locations?contactId=${contactId}`;
                } else {
                    throw new Error('Either companyId or contactId is required');
                }

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error('Failed to fetch locations');
                }

                const result = await response.json();
                // Handle different API response structures (array vs { locations: [] })
                const locationsData = Array.isArray(result) ? result : (result.locations || []);
                setLocations(locationsData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load locations');
            } finally {
                setLoading(false);
            }
        };

        if (companyId || contactId) {
            fetchLocations();
        }
    }, [companyId, contactId]);

    if (loading) {
        return (
            <div className={styles.locationListContainer}>
                <div className={styles.locationsWrapper}>
                    <Skeleton width="100%" height={300} style={{ borderRadius: '8px', marginBottom: '16px' }} />
                    <ul className={styles.locationList}>
                        {[1, 2].map((i) => (
                            <li key={i} className={styles.locationItem}>
                                <div className={styles.locationInfo} style={{ width: '100%' }}>
                                    <Skeleton width="40%" height={24} style={{ marginBottom: '8px' }} />
                                    <Skeleton width="80%" height={16} style={{ marginBottom: '4px' }} />
                                    <Skeleton width="60%" height={16} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.locationListContainer}>
            {locations.length === 0 ? (
                <p className={styles.noLocations}>No locations added yet.</p>
            ) : (
                <div className={styles.locationsWrapper}>

                    <MapWithNoSSR locations={locations} />
                    <ul className={styles.locationList}>
                        {locations.map((location) => (
                            <li key={location.id} className={styles.locationItem}>
                                <div className={styles.locationInfo}>
                                    <h4 className={styles.locationName}>{location.name}</h4>
                                    <p className={styles.locationAddress}>
                                        {location.address}, {location.city}, {location.state} {location.postal_code}
                                    </p>
                                    {location.latitude && location.longitude && (
                                        <p className={styles.locationCoords}>
                                            Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}