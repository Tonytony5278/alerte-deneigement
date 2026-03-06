jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
  getPushToken: jest.fn(),
}));

jest.mock('../services/api', () => ({
  getWatches: jest.fn(),
  createWatch: jest.fn(),
  deleteWatch: jest.fn(),
  updateWatch: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { getPushToken } from '../services/notificationService';
import { getWatches, createWatch, deleteWatch } from '../services/api';
import { useWatchStore } from '../stores/watchStore';

const mockSecureGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSecureSetItem = SecureStore.setItemAsync as jest.Mock;
const mockGetPushToken = getPushToken as jest.Mock;
const mockGetWatches = getWatches as jest.Mock;
const mockCreateWatch = createWatch as jest.Mock;
const mockDeleteWatch = deleteWatch as jest.Mock;

beforeEach(() => {
  mockSecureGetItem.mockReset();
  mockSecureSetItem.mockReset().mockResolvedValue(undefined);
  mockGetPushToken.mockReset();
  mockGetWatches.mockReset();
  mockCreateWatch.mockReset();
  mockDeleteWatch.mockReset();

  // Reset store
  useWatchStore.setState({
    anonUserId: null,
    watches: [],
    pushToken: null,
    isLoading: false,
    error: null,
  });
});

describe('watchStore', () => {
  describe('init', () => {
    it('creates a new anon ID if none exists', async () => {
      mockSecureGetItem.mockResolvedValue(null);
      mockGetPushToken.mockResolvedValue('ExponentPushToken[xxx]');
      mockGetWatches.mockResolvedValue([]);

      await useWatchStore.getState().init();

      expect(mockSecureSetItem).toHaveBeenCalledWith(
        'alerte_deneigement_anon_id',
        expect.stringMatching(/^[0-9a-f-]{36}$/)
      );
      expect(useWatchStore.getState().pushToken).toBe('ExponentPushToken[xxx]');
    });

    it('reuses existing anon ID', async () => {
      mockSecureGetItem.mockResolvedValue('existing-uuid');
      mockGetPushToken.mockResolvedValue(null);
      mockGetWatches.mockResolvedValue([]);

      await useWatchStore.getState().init();

      expect(mockSecureSetItem).not.toHaveBeenCalled();
      expect(useWatchStore.getState().anonUserId).toBe('existing-uuid');
    });

    it('loads watches after init', async () => {
      const watches = [{ id: 'w1', segment_id: 's1' }];
      mockSecureGetItem.mockResolvedValue('uuid-1');
      mockGetPushToken.mockResolvedValue('token');
      mockGetWatches.mockResolvedValue(watches);

      await useWatchStore.getState().init();

      expect(useWatchStore.getState().watches).toEqual(watches);
    });
  });

  describe('addWatch', () => {
    it('throws if not initialized', async () => {
      const segment = { id: 's1', city_id: 'montreal', nom_voie: 'Rue Test' } as any;
      await expect(useWatchStore.getState().addWatch(segment)).rejects.toThrow('User not initialized');
    });

    it('throws if no push token', async () => {
      useWatchStore.setState({ anonUserId: 'uuid-1', pushToken: null });

      const segment = { id: 's1', city_id: 'montreal', nom_voie: 'Rue Test' } as any;
      await expect(useWatchStore.getState().addWatch(segment)).rejects.toThrow('Notifications non activées');
    });

    it('creates watch and adds to state', async () => {
      useWatchStore.setState({ anonUserId: 'uuid-1', pushToken: 'token', watches: [] });

      const newWatch = { id: 'w1', segment_id: 's1' };
      mockCreateWatch.mockResolvedValue(newWatch);

      const segment = { id: 's1', city_id: 'montreal', nom_voie: 'Rue Test' } as any;
      const result = await useWatchStore.getState().addWatch(segment);

      expect(result).toEqual(newWatch);
      expect(useWatchStore.getState().watches).toContainEqual(newWatch);
      expect(mockCreateWatch).toHaveBeenCalledWith(
        expect.objectContaining({
          segmentId: 's1',
          cityId: 'montreal',
          pushToken: 'token',
          anonUserId: 'uuid-1',
        })
      );
    });
  });

  describe('removeWatch', () => {
    it('removes watch from state', async () => {
      useWatchStore.setState({
        anonUserId: 'uuid-1',
        pushToken: 'token',
        watches: [
          { id: 'w1', segment_id: 's1' } as any,
          { id: 'w2', segment_id: 's2' } as any,
        ],
      });

      mockDeleteWatch.mockResolvedValue(undefined);
      await useWatchStore.getState().removeWatch('w1');

      expect(useWatchStore.getState().watches).toHaveLength(1);
      expect(useWatchStore.getState().watches[0].id).toBe('w2');
    });
  });

  describe('getWatchForSegment', () => {
    it('returns watch for segment', () => {
      useWatchStore.setState({
        watches: [{ id: 'w1', segment_id: 's1' } as any],
      });

      const watch = useWatchStore.getState().getWatchForSegment('s1');
      expect(watch?.id).toBe('w1');
    });

    it('returns undefined for unknown segment', () => {
      useWatchStore.setState({ watches: [] });
      expect(useWatchStore.getState().getWatchForSegment('nope')).toBeUndefined();
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useWatchStore.setState({ error: 'some error' });
      useWatchStore.getState().clearError();
      expect(useWatchStore.getState().error).toBeNull();
    });
  });
});
