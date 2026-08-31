import { ArcGISRequestError, request } from '@esri/arcgis-rest-request';
import { searchItems } from '@esri/arcgis-rest-portal';
import {
  portalUrlCandidates,
  discoverWithPortalCandidates,
  discoverFeatureServices,
  checkEditPrivilege,
  describeAuthFailure
} from './PortalDiscovery';

/**
 * Tests for browsing an arcgis portal URL
 */

jest.mock('@esri/arcgis-rest-request', () => {
  const actual = jest.requireActual('@esri/arcgis-rest-request');
  return { ...actual, request: jest.fn() };
});
jest.mock('@esri/arcgis-rest-portal', () => ({ searchItems: jest.fn() }));

const notFoundError = (url: string): ArcGISRequestError => new ArcGISRequestError('Not Found', 'HTTP 404', undefined, url);
const mockedRequest = request as jest.Mock;
const mockedSearchItems = searchItems as jest.Mock;
const silentConsole = { log: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Console;

beforeEach(() => {
  mockedRequest.mockReset();
  mockedSearchItems.mockReset();
});

describe('portalUrlCandidates', () => {
  it('uses the url as-is when it already points at sharing/rest', () => {
    expect(portalUrlCandidates('https://my.portal.com/arcgis/sharing/rest'))
      .toEqual(['https://my.portal.com/arcgis/sharing/rest']);
  });

  it('appends sharing/rest to a url that already includes a web adaptor path', () => {
    expect(portalUrlCandidates('https://my.portal.com/gis'))
      .toEqual(['https://my.portal.com/gis/sharing/rest']);
  });

  it('offers the conventional "arcgis" web adaptor path as a second candidate for a bare hostname', () => {
    expect(portalUrlCandidates('https://gis.example.com')).toEqual([
      'https://gis.example.com/sharing/rest',
      'https://gis.example.com/arcgis/sharing/rest'
    ]);
  });

  it('strips a feature service path down to the server root before building candidates', () => {
    expect(portalUrlCandidates('https://my.portal.com/arcgis/rest/services/MyLayer/FeatureServer'))
      .toEqual(['https://my.portal.com/arcgis/sharing/rest']);
  });

  it('returns no candidates for an empty input', () => {
    expect(portalUrlCandidates('')).toEqual([]);
    expect(portalUrlCandidates(undefined)).toEqual([]);
  });
});

describe('discoverWithPortalCandidates', () => {
  it('uses the first candidate portal url when it succeeds', async () => {
    mockedSearchItems.mockResolvedValue({ results: [], total: 0, start: 1, num: 100 });
    const buildIdentity = jest.fn().mockResolvedValue({ username: 'jdoe' });

    const result = await discoverWithPortalCandidates(
      'https://my.portal.com/arcgis/sharing/rest', buildIdentity, undefined, undefined, undefined, silentConsole
    );

    expect(result.portalUrl).toEqual('https://my.portal.com/arcgis/sharing/rest');
    expect(buildIdentity).toHaveBeenCalledTimes(1);
    expect(buildIdentity).toHaveBeenCalledWith('https://my.portal.com/arcgis/sharing/rest');
  });

  it('falls back to the backup (arcgis web adaptor) candidate when the first one fails', async () => {
    const buildIdentity = jest.fn()
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ username: 'jdoe' });
    mockedSearchItems.mockResolvedValue({ results: [], total: 0, start: 1, num: 100 });

    const result = await discoverWithPortalCandidates(
      'https://gis.example.com', buildIdentity, undefined, undefined, undefined, silentConsole
    );

    expect(buildIdentity).toHaveBeenNthCalledWith(1, 'https://gis.example.com/sharing/rest');
    expect(buildIdentity).toHaveBeenNthCalledWith(2, 'https://gis.example.com/arcgis/sharing/rest');
    expect(result.portalUrl).toEqual('https://gis.example.com/arcgis/sharing/rest');
  });

  it('also retries the backup candidate when identity succeeds but the actual search fails', async () => {
    const buildIdentity = jest.fn().mockResolvedValue({ username: 'jdoe' });
    mockedSearchItems
      .mockRejectedValueOnce(new Error('search failed against wrong portal'))
      .mockResolvedValueOnce({ results: [], total: 0, start: 1, num: 100 });

    const result = await discoverWithPortalCandidates(
      'https://gis.example.com', buildIdentity, undefined, undefined, undefined, silentConsole
    );

    expect(mockedSearchItems).toHaveBeenCalledTimes(2);
    expect(result.portalUrl).toEqual('https://gis.example.com/arcgis/sharing/rest');
  });

  it('throws (failure to authenticate) when every candidate fails', async () => {
    const authError = new Error('invalid credentials');
    const buildIdentity = jest.fn().mockRejectedValue(authError);

    await expect(discoverWithPortalCandidates(
      'https://gis.example.com', buildIdentity, undefined, undefined, undefined, silentConsole
    )).rejects.toThrow('invalid credentials');
    expect(buildIdentity).toHaveBeenCalledTimes(2);
  });

  it('throws when no portal url is provided at all', async () => {
    const buildIdentity = jest.fn();
    await expect(discoverWithPortalCandidates(
      undefined, buildIdentity, undefined, undefined, undefined, silentConsole
    )).rejects.toThrow('portalUrl is required');
    expect(buildIdentity).not.toHaveBeenCalled();
  });

  it('falls back to the backup candidate when the given portal url comes back 404 not found', async () => {
    const buildIdentity = jest.fn()
      .mockRejectedValueOnce(notFoundError('https://gis.example.com/sharing/rest/generateToken'))
      .mockResolvedValueOnce({ username: 'jdoe' });
    mockedSearchItems.mockResolvedValue({ results: [], total: 0, start: 1, num: 100 });

    const result = await discoverWithPortalCandidates(
      'https://gis.example.com', buildIdentity, undefined, undefined, undefined, silentConsole
    );

    expect(result.portalUrl).toEqual('https://gis.example.com/arcgis/sharing/rest');
  });

  it('surfaces the 404 (portal url not found) error when every candidate comes back not found', async () => {
    const buildIdentity = jest.fn().mockRejectedValue(notFoundError('https://gis.example.com/sharing/rest/generateToken'));

    await expect(discoverWithPortalCandidates(
      'https://gis.example.com', buildIdentity, undefined, undefined, undefined, silentConsole
    )).rejects.toMatchObject({ code: 'HTTP 404' });
    expect(buildIdentity).toHaveBeenCalledTimes(2);
  });

  it('reports mayLackEditPrivilege from the successful candidate', async () => {
    mockedSearchItems.mockResolvedValue({ results: [], total: 0, start: 1, num: 100 });
    mockedRequest.mockResolvedValue({ username: 'jdoe', privileges: [] });
    const buildIdentity = jest.fn().mockResolvedValue({ username: 'jdoe' });

    const result = await discoverWithPortalCandidates(
      'https://my.portal.com/arcgis/sharing/rest', buildIdentity, undefined, undefined, undefined, silentConsole
    );

    expect(result.mayLackEditPrivilege).toBe(true);
  });
});

describe('discoverFeatureServices', () => {
  it('returns the discovered feature services', async () => {
    mockedSearchItems.mockResolvedValue({
      results: [{ id: '1', title: 'My Service', url: 'https://host/arcgis/rest/services/My/FeatureServer', owner: 'jdoe' }],
      total: 1,
      start: 1,
      num: 100
    });
    mockedRequest.mockResolvedValue({ capabilities: 'Query,Create,Update,Delete,Editing' });

    const page = await discoverFeatureServices({ username: 'jdoe' } as any, silentConsole);

    expect(page.total).toEqual(1);
    expect(page.services).toHaveLength(1);
    expect(page.services[0]).toMatchObject({ id: '1', title: 'My Service', url: 'https://host/arcgis/rest/services/My/FeatureServer' });
  });

  it('marks a service with no edit capabilities as "Read only"', async () => {
    mockedSearchItems.mockResolvedValue({
      results: [{ id: '2', title: 'View Only Service', url: 'https://host/arcgis/rest/services/ViewOnly/FeatureServer', owner: 'jdoe' }],
      total: 1,
      start: 1,
      num: 100
    });
    mockedRequest.mockResolvedValue({ capabilities: 'Query' });

    const page = await discoverFeatureServices({ username: 'jdoe' } as any, silentConsole);

    expect(page.services[0].permission).toEqual('Read only');
  });

  it('does not mark a service with edit capabilities as read only', async () => {
    mockedSearchItems.mockResolvedValue({
      results: [{ id: '3', title: 'Editable Service', url: 'https://host/arcgis/rest/services/Editable/FeatureServer', owner: 'jdoe' }],
      total: 1,
      start: 1,
      num: 100
    });
    mockedRequest.mockResolvedValue({ capabilities: 'Query,Create,Editing' });

    const page = await discoverFeatureServices({ username: 'jdoe' } as any, silentConsole);

    expect(page.services[0].permission).toEqual('');
  });
});

describe('checkEditPrivilege', () => {
  it('returns false (does not lack privilege) when the user has features:user:edit', async () => {
    mockedRequest.mockResolvedValue({ username: 'jdoe', privileges: ['features:user:edit', 'portal:user:shareToPublic'] });

    const mayLack = await checkEditPrivilege('https://my.portal.com/arcgis/sharing/rest', {} as any, silentConsole);

    expect(mayLack).toBe(false);
  });

  it('returns true (may lack privilege) when the user does not have features:user:edit', async () => {
    mockedRequest.mockResolvedValue({ username: 'jdoe', privileges: ['portal:user:shareToPublic'] });

    const mayLack = await checkEditPrivilege('https://my.portal.com/arcgis/sharing/rest', {} as any, silentConsole);

    expect(mayLack).toBe(true);
  });

  it('returns undefined (unknown) when the privilege check itself fails', async () => {
    mockedRequest.mockRejectedValue(new Error('community/self failed'));

    const mayLack = await checkEditPrivilege('https://my.portal.com/arcgis/sharing/rest', {} as any, silentConsole);

    expect(mayLack).toBeUndefined();
  });
});

describe('describeAuthFailure', () => {
  it('reports a not-found message for a 404, instead of blaming credentials', () => {
    const message = describeAuthFailure('portal', notFoundError('https://gis.example.com/sharing/rest/generateToken'));

    expect(message).toEqual('Could not find an ArcGIS endpoint at the portal URL. Check the URL and try again.');
  });

  it('reports an invalid-credentials message for a non-404 error', () => {
    const message = describeAuthFailure('portal', new Error('Invalid username or password.'));

    expect(message).toEqual('Invalid credentials provided to communicate with portal: Invalid username or password.');
  });
});
