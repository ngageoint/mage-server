const mockingoose = require("mockingoose");

jest.mock('@esri/arcgis-rest-request', () => {
  const actual = jest.requireActual('@esri/arcgis-rest-request');
  return { ...actual, request: jest.fn() };
});

import { request, ArcGISIdentityManager } from '@esri/arcgis-rest-request';
import { ObservationsSender } from './ObservationsSender';
import { ObservationsTransformer } from './ObservationsTransformer';
import { EventTransform } from './EventTransform';
import { ArcObjects } from './ArcObjects';
import { LayerInfo } from './LayerInfo';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from './types/ArcGISPluginConfig';
import { Attachment, ObservationAttrs } from '@ngageoint/mage.service/lib/entities/observations/entities.observations';
import { Acl, MageEvent } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { Form, FormField, FormFieldType } from '@ngageoint/mage.service/lib/entities/events/entities.events.forms';
import { Model as IconModel } from '@ngageoint/mage.service/lib/models/icon';

const silentConsole = { log: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Console;
const mockedRequest = request as jest.Mock;
const fakeIdentityManager = { username: 'jdoe' } as unknown as ArcGISIdentityManager;

const simpleStyle = { fill: '#caf9fa' } as any;
const emptyACL: Acl = {} as Acl;
const observationForm = {
  id: 1, name: 'incident report', description: 'incident report form',
  default: false, color: '#BEADED', archived: false, userFields: [],
  fields: [
    { id: 1, archived: false, name: 'title', title: 'Title', type: FormFieldType.Text, required: false, value: null } as FormField,
    { id: 2, archived: false, name: 'description', title: 'Description', type: FormFieldType.TextArea, required: false, value: null } as FormField,
    { id: 3, archived: false, name: 'population', title: 'Population', type: FormFieldType.Numeric, required: false, value: null } as FormField
  ]
} as Form;
const eventWithForm = new MageEvent({
  id: 4321, name: 'test event', layerIds: [], feedIds: [],
  forms: [observationForm], style: simpleStyle, acl: emptyACL
});

const config: ArcGISPluginConfig = { ...defaultArcGISPluginConfig } as ArcGISPluginConfig;

// builds a MAGE observation with the title/description/population form filled out
const buildObservation = (index: number): ObservationAttrs => ({
  id: `observation-${index}`,
  eventId: 4321,
  createdAt: new Date(),
  lastModified: new Date(),
  geometry: { type: 'Point', coordinates: [-1.391412 + index * 0.001, 50.885025] },
  attachments: [] as Attachment[],
  properties: {
    forms: [{
      id: `entry-${index}`,
      formId: 1,
      title: `Incident ${index}`,
      description: `Description for incident ${index}`,
      population: index * 100
    }]
  }
} as unknown as ObservationAttrs);

describe('ObservationsSender.sendAdds', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockingoose(IconModel).toReturn(null, 'findOne');
  });

  it('batches 10 observations into a single addFeatures request to the fake ArcGIS server', async () => {
    const transformer = new ObservationsTransformer(config, silentConsole);
    const eventTransform = new EventTransform(config, eventWithForm);

    const arcObjects = new ArcObjects();
    for (let i = 1; i <= 10; i++) {
      const arcObservation = await transformer.transform(buildObservation(i), eventTransform, null);
      arcObjects.add(arcObservation);
    }
    expect(arcObjects.count()).toEqual(10);

    mockedRequest.mockResolvedValue({
      addResults: arcObjects.observations.map((_, i) => ({ objectId: i + 1, success: true }))
    });

    const layerInfo = new LayerInfo('https://fake-arcgis.example.com/arcgis/rest/services/Incidents/FeatureServer/0', [4321], { id: 0, geometryType: 'esriGeometryPoint', fields: [] });
    const sender = new ObservationsSender(layerInfo, config, fakeIdentityManager, silentConsole);

    await sender.sendAdds(arcObjects);

    // 10 observations should be sent as a single batched request
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    const [url, options] = mockedRequest.mock.calls[0];
    expect(url).toEqual('https://fake-arcgis.example.com/arcgis/rest/services/Incidents/FeatureServer/0/addFeatures');
    expect(options.authentication).toBe(fakeIdentityManager);

    const sentFeatures = options.params.features;
    expect(sentFeatures).toHaveLength(10);

    const first = sentFeatures[0];
    expect(first.attributes.form1_title).toEqual('Incident 1');
    expect(first.attributes.form1_description).toEqual('Description for incident 1');
    expect(first.attributes.form1_population).toEqual(100);
    expect(first.geometry).toMatchObject({ x: -1.391412 + 0.001, y: 50.885025 });

    const tenth = sentFeatures[9];
    expect(tenth.attributes.form1_title).toEqual('Incident 10');
    expect(tenth.attributes.form1_population).toEqual(1000);
  });

  it('logs a per-feature failure from the fake server without throwing', async () => {
    const transformer = new ObservationsTransformer(config, silentConsole);
    const eventTransform = new EventTransform(config, eventWithForm);

    const arcObjects = new ArcObjects();
    arcObjects.add(await transformer.transform(buildObservation(1), eventTransform, null));

    mockedRequest.mockResolvedValue({
      addResults: [{ success: false, error: { code: 403, description: 'not authorized' } }]
    });

    const layerInfo = new LayerInfo('https://fake-arcgis.example.com/arcgis/rest/services/Incidents/FeatureServer/0', [4321], { id: 0, geometryType: 'esriGeometryPoint', fields: [] });
    const sender = new ObservationsSender(layerInfo, config, fakeIdentityManager, silentConsole);

    await expect(sender.sendAdds(arcObjects)).resolves.not.toThrow();

    expect(silentConsole.error).toHaveBeenCalledWith(expect.stringContaining('403'));
  });
});
