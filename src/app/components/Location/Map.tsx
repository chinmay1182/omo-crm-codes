'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface MapProps {
  locations: {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
  }[];
}

export default function Map({ locations }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize map only if we have locations with coordinates
    const validLocations = locations.filter(loc => loc.latitude && loc.longitude);
    if (validLocations.length === 0) return;

    if (!mapRef.current) {
      const firstLocation = validLocations[0];
      mapRef.current = L.map('map').setView(
        [firstLocation.latitude!, firstLocation.longitude!], 
        13
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    validLocations.forEach(location => {
      if (location.latitude && location.longitude) {
        const marker = L.marker([location.latitude, location.longitude])
          .addTo(mapRef.current!)
          .bindPopup(location.name);
        markersRef.current.push(marker);
      }
    });

    // Fit map to bounds if we have multiple locations
    if (validLocations.length > 1) {
      const bounds = L.latLngBounds(
        validLocations.map(loc => [loc.latitude!, loc.longitude!])
      );
      mapRef.current.fitBounds(bounds);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locations]);

  return <div id="map" style={{ height: '100%', width: '100%' }} />;
}