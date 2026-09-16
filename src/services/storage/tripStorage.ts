import { IndexedDBService } from './indexedDb';
import type { Trip, RoutePoint } from '../../models/types';

const DB_NAME = 'SpeedXDB';
const DB_VERSION = 1;
const STORE_NAME = 'trips';

export class TripStorageService extends IndexedDBService {
  constructor() {
    super(DB_NAME, DB_VERSION);
  }

  protected handleUpgrade(db: IDBDatabase, oldVersion: number): void {
    if (oldVersion < 1) {
      // Create trips object store with indexes
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('createdAt', 'createdAt', { unique: false });
      store.createIndex('startTime', 'startTime', { unique: false });
    }
  }

  async saveTrip(trip: Trip): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available in this browser');
    }

    try {
      const id = await this.put(STORE_NAME, trip);
      return id as string;
    } catch (error) {
      throw new Error('Trip could not be saved. Please try again.');
    }
  }

  async getTrip(id: string): Promise<Trip | undefined> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available in this browser');
    }

    try {
      return await this.get<Trip>(STORE_NAME, id);
    } catch (error) {
      throw new Error('Failed to load trip.');
    }
  }

  async getAllTrips(): Promise<Trip[]> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available in this browser');
    }

    try {
      const trips = await this.getAll<Trip>(STORE_NAME);
      // Sort by createdAt descending (newest first)
      return trips.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error('Failed to load trip history.');
    }
  }

  async deleteTrip(id: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available in this browser');
    }

    try {
      await this.delete(STORE_NAME, id);
    } catch (error) {
      throw new Error('Failed to delete trip.');
    }
  }

  async clearTrips(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available in this browser');
    }

    try {
      await this.clear(STORE_NAME);
    } catch (error) {
      throw new Error('Failed to clear trip history.');
    }
  }

  async getTripCount(): Promise<number> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available in this browser');
    }

    try {
      return await this.count(STORE_NAME);
    } catch (error) {
      return 0;
    }
  }

  isAvailable(): boolean {
    return super.isAvailable();
  }
}

// Singleton instance
let tripStorageInstance: TripStorageService | null = null;

export function getTripStorage(): TripStorageService {
  if (!tripStorageInstance) {
    tripStorageInstance = new TripStorageService();
  }
  return tripStorageInstance;
}