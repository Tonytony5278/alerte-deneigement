import { Platform, NativeModules } from 'react-native';
import type { WatchResult } from './api';

const APP_GROUP_ID = 'group.ca.alertedeneigement.app';

interface WidgetStreet {
  id: string;
  name: string;
  status: number;
  statusLabel: string;
  towingStatus: string;
  towingLabel: string | null;
  planifDate: string | null;
  updatedAt: string | null;
}

interface WidgetData {
  streets: WidgetStreet[];
  lastRefresh: string;
}

let SharedGroupPreferences: {
  setItem: (key: string, value: string, groupId: string) => Promise<void>;
} | null = null;

try {
  // Will be available when react-native-shared-group-preferences is installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SharedGroupPreferences = require('react-native-shared-group-preferences').default;
} catch {
  // Not installed — widget bridge will be a no-op
}

/**
 * Writes the current watched streets data to App Groups UserDefaults
 * so the iOS widget can read it.
 */
export async function updateWidgetData(watches: WatchResult[]): Promise<void> {
  if (Platform.OS !== 'ios' || !SharedGroupPreferences) return;

  try {
    const widgetData: WidgetData = {
      streets: watches.map((w) => ({
        id: w.segment_id,
        name: w.nom_voie ?? w.segment_id,
        status: w.etat ?? 0,
        statusLabel: w.etat_label ?? 'Inconnu',
        towingStatus: w.towing_status ?? 'none',
        towingLabel: w.towing_label ?? null,
        planifDate: w.date_deb_planif ?? null,
        updatedAt: w.updated_at ?? null,
      })),
      lastRefresh: new Date().toISOString(),
    };

    await SharedGroupPreferences.setItem(
      'widgetData',
      JSON.stringify(widgetData),
      APP_GROUP_ID
    );

    // Tell WidgetKit to reload timelines if native module available
    if (NativeModules.WidgetModule?.reloadAllTimelines) {
      NativeModules.WidgetModule.reloadAllTimelines();
    }
  } catch {
    // Widget bridge is best-effort — never block the main app
  }
}
