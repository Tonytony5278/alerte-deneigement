import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'alerte_deneigement_settings';
const ONBOARDING_KEY = 'alerte_deneigement_onboarding_done';

interface Settings {
  cityId: string;
  notifyOnChange: boolean;
  notifyT60: boolean;
  notifyT30: boolean;
  quietStart: string;
  quietEnd: string;
  stormAlerts: boolean;
}

interface SettingsStore extends Settings {
  onboardingDone: boolean;
  isLoaded: boolean;

  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const DEFAULTS: Settings = {
  cityId: 'montreal',
  notifyOnChange: true,
  notifyT60: true,
  notifyT30: true,
  quietStart: '22:00',
  quietEnd: '07:00',
  stormAlerts: true,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULTS,
  onboardingDone: false,
  isLoaded: false,

  async load() {
    const [raw, onboarding] = await Promise.all([
      AsyncStorage.getItem(SETTINGS_KEY),
      AsyncStorage.getItem(ONBOARDING_KEY),
    ]);
    const saved = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
    set({
      ...DEFAULTS,
      ...saved,
      onboardingDone: onboarding === 'true',
      isLoaded: true,
    });
  },

  async update(patch) {
    const current = { ...get() };
    const next = { ...current, ...patch } as Settings;
    set(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
      cityId: next.cityId,
      notifyOnChange: next.notifyOnChange,
      notifyT60: next.notifyT60,
      notifyT30: next.notifyT30,
      quietStart: next.quietStart,
      quietEnd: next.quietEnd,
      stormAlerts: next.stormAlerts,
    }));
  },

  async completeOnboarding() {
    set({ onboardingDone: true });
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  },
}));
