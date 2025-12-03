import { User, UserData } from "../types";

// Simulated "Cloud" Database stored in a separate LocalStorage key
const CLOUD_DB_KEY = 'gre_insight_cloud_db';
const SESSION_KEY = 'gre_insight_session';
const SYNC_CHANNEL_NAME = 'gre_insight_sync_channel';

// Event types for cross-tab synchronization
type SyncEvent = {
  type: 'LOGIN' | 'LOGOUT' | 'DATA_UPDATE';
  userId?: string;
};

interface CloudDB {
  users: Record<string, User & { passwordHash: string }>;
  userData: Record<string, UserData>; // userId -> Data
}

const getCloudDB = (): CloudDB => {
  const db = localStorage.getItem(CLOUD_DB_KEY);
  return db ? JSON.parse(db) : { users: {}, userData: {} };
};

const saveCloudDB = (db: CloudDB) => {
  localStorage.setItem(CLOUD_DB_KEY, JSON.stringify(db));
};

// Artificial delay to simulate network request latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Broadcast Channel for Cross-Tab Sync
const syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);

export const authService = {
  // Subscribe to sync events (for App.tsx)
  onSyncEvent: (callback: (event: SyncEvent) => void) => {
    const handler = (msg: MessageEvent) => {
      if (msg.data && (msg.data.type === 'LOGIN' || msg.data.type === 'LOGOUT' || msg.data.type === 'DATA_UPDATE')) {
        callback(msg.data as SyncEvent);
      }
    };
    syncChannel.addEventListener('message', handler);
    return () => syncChannel.removeEventListener('message', handler);
  },

  // Login
  login: async (email: string, password: string): Promise<User> => {
    await delay(600);
    const db = getCloudDB();
    const user = Object.values(db.users).find(u => u.email === email && u.passwordHash === btoa(password));
    
    if (!user) {
      throw new Error("Invalid email or password");
    }
    
    const safeUser = { id: user.id, email: user.email, name: user.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    
    // Broadcast Login Event
    syncChannel.postMessage({ type: 'LOGIN', userId: user.id });
    
    return safeUser;
  },

  // Register
  register: async (email: string, password: string, name: string): Promise<User> => {
    await delay(800);
    const db = getCloudDB();
    
    if (Object.values(db.users).some(u => u.email === email)) {
      throw new Error("User already exists");
    }

    const newUser = {
      id: 'user_' + Date.now(),
      email,
      name,
      passwordHash: btoa(password), // Mock encryption
    };

    db.users[newUser.id] = newUser;
    // Initialize empty data for new user
    db.userData[newUser.id] = {
      favorites: [],
      history: [],
      settings: { darkMode: false, serifFont: true, fontSize: 'medium' },
      wordCache: {},
      studyStats: { streakDays: 1, lastStudyDate: new Date().toISOString().split('T')[0] }
    };
    
    saveCloudDB(db);
    
    const safeUser = { id: newUser.id, email: newUser.email, name: newUser.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    
    // Broadcast Login Event (Register implies login)
    syncChannel.postMessage({ type: 'LOGIN', userId: newUser.id });

    return safeUser;
  },

  // Logout
  logout: async () => {
    await delay(200);
    localStorage.removeItem(SESSION_KEY);
    // Broadcast Logout Event
    syncChannel.postMessage({ type: 'LOGOUT' });
  },

  // Get Current Session
  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  // Cloud Sync: Save Data
  saveUserData: async (userId: string, data: UserData) => {
    // In a real app, this would be a POST/PUT request
    const db = getCloudDB();
    db.userData[userId] = data;
    saveCloudDB(db);
    
    // Broadcast Update Event so other tabs reload data
    syncChannel.postMessage({ type: 'DATA_UPDATE', userId });
    
    // No artificial delay needed for 'save' to feel responsive
    await delay(100); 
  },

  // Cloud Sync: Fetch Data
  fetchUserData: async (userId: string): Promise<UserData | null> => {
    await delay(400); // Simulate network read latency
    const db = getCloudDB();
    return db.userData[userId] || null;
  }
};