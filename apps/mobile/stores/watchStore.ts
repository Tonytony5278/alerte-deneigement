import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { WatchResult, StreetResult, WatchConfig } from '@/services/api';
import { createWatch, deleteWatch, getWatches, updateWatch } from '@/services/api';
import { getPushToken } from '@/services/notificationService';

// v4 uuid dependency — lightweight polyfill using Math.random for RN
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ANON_ID_KEY = 'alerte_deneigement_anon_id';

interface WatchStore {
  anonUserId: string | null;
  watches: WatchResult[];
  pushToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;
  loadWatches: () => Promise<void>;
  addWatch: (segment: StreetResult, label?: string) => Promise<WatchResult>;
  removeWatch: (watchId: string) => Promise<void>;
  getWatchForSegment: (segmentId: string) => WatchResult | undefined;
  syncNotifPrefsToServer: (prefs: WatchConfig) => Promise<void>;
  clearError: () => void;
}

export const useWatchStore = create<WatchStore>((set, get) => ({
  anonUserId: null,
  watches: [],
  pushToken: null,
  isLoading: false,
  error: null,

  async init() {
    // Load or create anonymous user ID
    let anonId = await SecureStore.getItemAsync(ANON_ID_KEY);
    if (!anonId) {
      anonId = generateUuid();
      await SecureStore.setItemAsync(ANON_ID_KEY, anonId);
    }

    // Get push token
    const token = await getPushToken();

    set({ anonUserId: anonId, pushToken: token });

    // Load existing watches from API
    await get().loadWatches();
  },

  async loadWatches() {
    const { anonUserId } = get();
    if (!anonUserId) return;

    set({ isLoading: true, error: null });
    try {
      const watches = await getWatches(anonUserId);
      set({ watches, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de chargement';
      set({ error: msg, isLoading: false });
    }
  },

  async addWatch(segment, label) {
    const { anonUserId, pushToken } = get();
    if (!anonUserId) throw new Error('User not initialized');
    if (!pushToken) throw new Error('Notifications non activées — active les notifications pour surveiller ta rue.');

    set({ isLoading: true, error: null });
    try {
      const watch = await createWatch({
        segmentId: segment.id,
        pushToken,
        anonUserId,
        label: label ?? segment.nom_voie,
      });
      set((state) => ({ watches: [watch, ...state.watches], isLoading: false }));
      return watch;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible de créer la surveillance';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  async removeWatch(watchId) {
    set({ isLoading: true });
    try {
      await deleteWatch(watchId);
      set((state) => ({
        watches: state.watches.filter((w) => w.id !== watchId),
        isLoading: false,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible de supprimer la surveillance';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  getWatchForSegment(segmentId) {
    return get().watches.find((w) => w.segment_id === segmentId);
  },

  async syncNotifPrefsToServer(prefs) {
    const { watches } = get();
    if (watches.length === 0) return;
    await Promise.allSettled(
      watches.map((w) =>
        updateWatch(w.id, {
          config: {
            notifyOnChange: prefs.notifyOnChange,
            notifyT60: prefs.notifyT60,
            notifyT30: prefs.notifyT30,
            quietStart: prefs.quietStart,
            quietEnd: prefs.quietEnd,
          },
        })
      )
    );
    await get().loadWatches();
  },

  clearError() {
    set({ error: null });
  },
}));
