import { ArcGISIdentityManager } from '@esri/arcgis-rest-request';
import { ArcGISIdentityService } from './ArcGISService';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from './types/ArcGISPluginConfig';
import { FeatureServiceConfig } from './types/ArcGISConfig';
import { buildFeatureServicesForSave, commitFeatureService, IncomingFeatureServiceConfig } from './FeatureServiceConfigStore';

/**
 * Tests for saving feature services to the config
 */

jest.mock('@esri/arcgis-rest-request', () => {
  const actual = jest.requireActual('@esri/arcgis-rest-request');
  return { ...actual, request: jest.fn() };
});

const silentConsole = { log: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Console;
const emptyConfig = (): ArcGISPluginConfig => ({ ...defaultArcGISPluginConfig, featureServices: [] } as ArcGISPluginConfig);
const fakeIdentityManager = (username: string): ArcGISIdentityManager => ({
  username,
  serialize: () => JSON.stringify({ username })
} as unknown as ArcGISIdentityManager);

describe('commitFeatureService', () => {
  it('adds a newly-selected feature service to the config with no layers yet, and persists it', async () => {
    const config = emptyConfig();
    const identityService: ArcGISIdentityService = {
      signin: jest.fn().mockResolvedValue(fakeIdentityManager('jdoe')),
      updateIndentityManagers: jest.fn()
    };
    const patchConfig = jest.fn().mockResolvedValue(config);
    const sanitized = await commitFeatureService(
      patchConfig, identityService, config, 'https://host/arcgis/rest/services/My/FeatureServer',
      'https://host/arcgis/sharing/rest', fakeIdentityManager('jdoe'), silentConsole
    );

    expect(config.featureServices).toHaveLength(1);
    expect(config.featureServices[0]).toMatchObject({
      url: 'https://host/arcgis/rest/services/My/FeatureServer',
      portalUrl: 'https://host/arcgis/sharing/rest',
      layers: []
    });
    expect(patchConfig).toHaveBeenCalledWith(config);
    expect(sanitized.authenticated).toBe(true);
    // never leak the serialized identity manager back to the client
    expect((sanitized as any).identityManager).toBeUndefined();
  });

  it('updates the identityManager and portalUrl of an already-selected feature service, without touching its saved layers', async () => {
    const existing: FeatureServiceConfig = {
      url: 'https://host/arcgis/rest/services/My/FeatureServer',
      portalUrl: 'https://host/old-portal/sharing/rest',
      identityManager: JSON.stringify({ username: 'old-user' }),
      layers: [{ layer: 'Incidents', eventIds: [42] }]
    };
    const config: ArcGISPluginConfig = { ...defaultArcGISPluginConfig, featureServices: [existing] } as ArcGISPluginConfig;
    const identityService: ArcGISIdentityService = {
      signin: jest.fn().mockResolvedValue(fakeIdentityManager('jdoe')),
      updateIndentityManagers: jest.fn()
    };
    const patchConfig = jest.fn().mockResolvedValue(config);

    await commitFeatureService(
      patchConfig, identityService, config, existing.url,
      'https://host/new-portal/sharing/rest', fakeIdentityManager('jdoe'), silentConsole
    );

    expect(config.featureServices).toHaveLength(1);
    expect(config.featureServices[0].portalUrl).toEqual('https://host/new-portal/sharing/rest');
    expect(config.featureServices[0].identityManager).toEqual(JSON.stringify({ username: 'jdoe' }));
    expect(config.featureServices[0].layers).toEqual([{ layer: 'Incidents', eventIds: [42] }]);
  });
});

describe('buildFeatureServicesForSave', () => {
  it('converts a selected layers event names to event ids', () => {
    const updated: IncomingFeatureServiceConfig[] = [{
      url: 'https://host/arcgis/rest/services/My/FeatureServer',
      portalUrl: 'https://host/arcgis/sharing/rest',
      layers: [{ layer: 'Incidents', events: ['Training Event'] }]
    }];
    const eventNameToIdMap = new Map([['Training Event', 42]]);
    const result = buildFeatureServicesForSave(updated, [], eventNameToIdMap);
    expect(result).toHaveLength(1);
    expect(result[0].layers).toEqual([{ layer: 'Incidents', events: ['Training Event'], eventIds: [42] }]);
  });

  it('drops event names that no longer correspond to a known event', () => {
    const updated: IncomingFeatureServiceConfig[] = [{
      url: 'https://host/arcgis/rest/services/My/FeatureServer',
      layers: [{ layer: 'Incidents', events: ['Deleted Event'] }]
    }];
    const result = buildFeatureServicesForSave(updated, [], new Map());
    expect(result[0].layers[0].eventIds).toEqual([]);
  });

  it('carries forward the identityManager already persisted for a matching existing service', () => {
    const existing: FeatureServiceConfig[] = [{
      url: 'https://host/arcgis/rest/services/My/FeatureServer',
      identityManager: 'serialized-identity',
      layers: []
    }];
    const updated: IncomingFeatureServiceConfig[] = [{
      url: 'https://host/arcgis/rest/services/My/FeatureServer',
      layers: [{ layer: 'Incidents', events: [] }]
    }];
    const result = buildFeatureServicesForSave(updated, existing, new Map());
    expect(result[0].identityManager).toEqual('serialized-identity');
  });

  it('leaves identityManager empty for a service with no existing match', () => {
    const updated: IncomingFeatureServiceConfig[] = [{
      url: 'https://host/arcgis/rest/services/New/FeatureServer',
      layers: []
    }];
    const result = buildFeatureServicesForSave(updated, [], new Map());
    expect(result[0].identityManager).toEqual('');
  });

  it('handles multiple services and layers, each resolving independently', () => {
    const existing: FeatureServiceConfig[] = [{
      url: 'https://host/arcgis/rest/services/A/FeatureServer',
      identityManager: 'identity-a',
      layers: []
    }];
    const updated: IncomingFeatureServiceConfig[] = [
      {
        url: 'https://host/arcgis/rest/services/A/FeatureServer',
        layers: [
          { layer: 'Layer1', events: ['Event One'] },
          { layer: 'Layer2', events: ['Event One', 'Event Two'] }
        ]
      },
      {
        url: 'https://host/arcgis/rest/services/B/FeatureServer',
        layers: [{ layer: 'Layer3', events: [] }]
      }
    ];
    const eventNameToIdMap = new Map([['Event One', 1], ['Event Two', 2]]);
    const result = buildFeatureServicesForSave(updated, existing, eventNameToIdMap);

    expect(result).toHaveLength(2);
    expect(result[0].identityManager).toEqual('identity-a');
    expect(result[0].layers[0].eventIds).toEqual([1]);
    expect(result[0].layers[1].eventIds).toEqual([1, 2]);
    expect(result[1].identityManager).toEqual('');
    expect(result[1].layers[0].eventIds).toEqual([]);
  });
});
