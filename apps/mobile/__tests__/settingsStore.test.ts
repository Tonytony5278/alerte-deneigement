import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

import { useSettingsStore } from '../stores/settingsStore';

beforeEach(() => {
  mockGetItem.mockReset();
  mockSetItem.mockReset().mockResolvedValue(undefined);

  // Reset store to defaults
  useSettingsStore.setState({
    cityId: 'montreal',
    notifyOnChange: true,
    notifyT60: true,
    notifyT30: true,
    quietStart: '22:00',
    quietEnd: '07:00',
    stormAlerts: true,
    onboardingDone: false,
    isLoaded: false,
  });
});

describe('settingsStore', () => {
  it('has correct defaults', () => {
    const state = useSettingsStore.getState();
    expect(state.cityId).toBe('montreal');
    expect(state.notifyOnChange).toBe(true);
    expect(state.notifyT60).toBe(true);
    expect(state.notifyT30).toBe(true);
    expect(state.quietStart).toBe('22:00');
    expect(state.quietEnd).toBe('07:00');
    expect(state.stormAlerts).toBe(true);
    expect(state.onboardingDone).toBe(false);
    expect(state.isLoaded).toBe(false);
  });

  it('loads saved settings from AsyncStorage', async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'alerte_deneigement_settings') {
        return Promise.resolve(JSON.stringify({ cityId: 'laval', notifyT30: false }));
      }
      if (key === 'alerte_deneigement_onboarding_done') {
        return Promise.resolve('true');
      }
      return Promise.resolve(null);
    });

    await useSettingsStore.getState().load();

    const state = useSettingsStore.getState();
    expect(state.cityId).toBe('laval');
    expect(state.notifyT30).toBe(false);
    expect(state.notifyOnChange).toBe(true);
    expect(state.onboardingDone).toBe(true);
    expect(state.isLoaded).toBe(true);
  });

  it('loads defaults when no saved data', async () => {
    mockGetItem.mockResolvedValue(null);

    await useSettingsStore.getState().load();

    const state = useSettingsStore.getState();
    expect(state.cityId).toBe('montreal');
    expect(state.onboardingDone).toBe(false);
    expect(state.isLoaded).toBe(true);
  });

  it('update() persists partial changes', async () => {
    await useSettingsStore.getState().update({ cityId: 'quebec', notifyT60: false });

    const state = useSettingsStore.getState();
    expect(state.cityId).toBe('quebec');
    expect(state.notifyT60).toBe(false);

    expect(mockSetItem).toHaveBeenCalledWith(
      'alerte_deneigement_settings',
      expect.stringContaining('"cityId":"quebec"')
    );
  });

  it('completeOnboarding sets flag and persists', async () => {
    await useSettingsStore.getState().completeOnboarding();

    expect(useSettingsStore.getState().onboardingDone).toBe(true);
    expect(mockSetItem).toHaveBeenCalledWith('alerte_deneigement_onboarding_done', 'true');
  });
});
