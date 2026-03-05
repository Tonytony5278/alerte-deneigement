import type { NormalizedSegment } from '../../types';

export interface CityAdapter {
  cityId: string;
  fetch(): Promise<NormalizedSegment[]>;
}
