import { useState, useEffect, useCallback } from 'react';
import { getTripStorage } from '../services/storage';
import type { Trip } from '../models/types';

export function useTripHistory() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(false);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const storage = getTripStorage();
      const available = storage.isAvailable();
      setStorageAvailable(available);
      
      if (!available) {
        setTrips([]);
        setError('Trip history is unavailable in this browser');
        return;
      }
      
      const allTrips = await storage.getAllTrips();
      setTrips(allTrips);
    } catch (err) {
      setError('Failed to load trip history');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTrip = useCallback(async (id: string) => {
    try {
      const storage = getTripStorage();
      if (!storage.isAvailable()) {
        throw new Error('Trip storage is unavailable');
      }
      
      await storage.deleteTrip(id);
      
      // Update local state
      setTrips(prev => prev.filter(trip => trip.id !== id));
    } catch (err) {
      throw new Error('Failed to delete trip');
    }
  }, []);

  const clearAllTrips = useCallback(async () => {
    try {
      const storage = getTripStorage();
      if (!storage.isAvailable()) {
        throw new Error('Trip storage is unavailable');
      }
      
      await storage.clearTrips();
      
      // Update local state
      setTrips([]);
    } catch (err) {
      throw new Error('Failed to clear trip history');
    }
  }, []);

  const getTripCount = useCallback(async (): Promise<number> => {
    try {
      const storage = getTripStorage();
      if (!storage.isAvailable()) {
        return 0;
      }
      
      return await storage.getTripCount();
    } catch (err) {
      return 0;
    }
  }, []);

  // Load trips on mount
  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  return {
    trips,
    loading,
    error,
    storageAvailable,
    loadTrips,
    deleteTrip,
    clearAllTrips,
    getTripCount,
  };
}