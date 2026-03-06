import { ApiError } from '../services/api';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Must import after mocking fetch
const api = require('../services/api');

beforeEach(() => {
  mockFetch.mockReset();
});

function mockResponse(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('ApiError', () => {
  it('stores status code', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('ApiError');
  });
});

describe('searchStreets', () => {
  it('calls correct URL with encoded params', async () => {
    mockResponse({ data: [{ id: '1', nom_voie: 'Rue Test' }] });
    const results = await api.searchStreets('rue test', 'montreal', 5);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/api/streets/search');
    expect(url).toContain('q=rue%20test');
    expect(url).toContain('cityId=montreal');
    expect(url).toContain('limit=5');
    expect(results).toHaveLength(1);
    expect(results[0].nom_voie).toBe('Rue Test');
  });

  it('throws ApiError on non-ok response', async () => {
    mockResponse({ error: 'Bad request' }, 400);
    await expect(api.searchStreets('x')).rejects.toThrow('Bad request');
  });
});

describe('getNearbyStreets', () => {
  it('calls correct URL with coordinates', async () => {
    mockResponse({ data: [] });
    await api.getNearbyStreets(45.5, -73.5, 'montreal', 200);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('lat=45.5');
    expect(url).toContain('lng=-73.5');
    expect(url).toContain('radius=200');
  });
});

describe('getStreet', () => {
  it('returns street data', async () => {
    const street = { id: 'seg1', nom_voie: 'Av du Parc', etat: 1 };
    mockResponse({ data: street });
    const result = await api.getStreet('seg1');
    expect(result.nom_voie).toBe('Av du Parc');
  });
});

describe('createWatch', () => {
  it('sends POST with payload', async () => {
    const watch = { id: 'w1', segment_id: 'seg1' };
    mockResponse({ data: watch });

    await api.createWatch({
      segmentId: 'seg1',
      cityId: 'montreal',
      pushToken: 'token123',
      anonUserId: 'uuid-1',
    });

    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.segmentId).toBe('seg1');
    expect(body.cityId).toBe('montreal');
    expect(body.pushToken).toBe('token123');
  });
});

describe('deleteWatch', () => {
  it('sends DELETE request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(undefined),
    });

    await api.deleteWatch('w1');
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
    expect(mockFetch.mock.calls[0][0]).toContain('/api/watches/w1');
  });
});

describe('getIncentiveParking', () => {
  it('omits params when no location provided', async () => {
    mockResponse({ data: [] });
    await api.getIncentiveParking();

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/api/parking/incentive');
    expect(url).not.toContain('lat=');
  });

  it('includes params when location provided', async () => {
    mockResponse({ data: [] });
    await api.getIncentiveParking(45.5, -73.5, 5000);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('lat=45.5');
    expect(url).toContain('lng=-73.5');
    expect(url).toContain('radius=5000');
  });
});

describe('submitReport', () => {
  it('sends POST with report payload', async () => {
    mockResponse({ data: { id: 'r1' } });

    await api.submitReport({
      segmentId: 'seg1',
      anonUserId: 'uuid-1',
      type: 'wrong_status',
    });

    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe('wrong_status');
  });
});
