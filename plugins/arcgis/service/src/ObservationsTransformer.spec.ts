// import the mock module before anything that imports mongoose
const mockingoose = require("mockingoose");

import { ObservationsTransformer } from './ObservationsTransformer';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from "./types/ArcGISPluginConfig";
import { Attachment, ObservationAttrs } from "@ngageoint/mage.service/lib/entities/observations/entities.observations";
import { EventTransform } from "./EventTransform";
import { LineStyle } from "@ngageoint/mage.service/lib/entities/entities.global";
import { Acl, MageEvent } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { Form, FormField, FormFieldType } from "@ngageoint/mage.service/lib/entities/events/entities.events.forms";
import { Model as IconModel } from '@ngageoint/mage.service/lib/models/icon';

describe('MAGE observation to ArcGIS feature transformer', () => {

  let simpleStyle: LineStyle = {fill: '#FACADE'} as LineStyle;
  let emptyACL: Acl = {} as Acl;
  let simpleForm = {
    id: 1, name: 'simple form', description: 'simple form description',
    default: false, color: '#BEADED', archived: false, userFields: [],
    fields: [{
      id: 1, archived: false, name: 'other_geometry', title: 'Geometry', type: FormFieldType.Geometry, required: false, value: null
    } as FormField]
  } as Form;
  let eventWithForm = new MageEvent({
    id: 4321, name: 'test event with simple form', layerIds: [], feedIds: [],
    forms: [simpleForm], style: simpleStyle, acl: emptyACL
  });

  let config: ArcGISPluginConfig = {} as ArcGISPluginConfig;
  Object.assign(config,
    {
      ...defaultArcGISPluginConfig,
      eventIdField: 'test_event_id'
    }
  );

  test('transforms an observation with an event icon', async () => {

    // mock the icon data that would otherwise have been loaded from MongoDB
    mockingoose(IconModel).toReturn({eventId: 4321, relativePath: '4321/icon.svg'}, 'findOne');

    const xformer = new ObservationsTransformer(config, console);
    const mageObservation = {
      id: 'testing321',
      properties: {forms: []},
      eventId: 4321,
      geometry: { type: 'Point', coordinates: [ -1.391412, 50.885025 ] },
      attachments: [] as Attachment[]
    } as unknown as ObservationAttrs;

    const eventTransform = new EventTransform(config, eventWithForm);
    const feature = await xformer.transform(mageObservation, eventTransform, null);
    expect(feature.object).not.toBeNull();
    expect(feature.object.attributes).not.toBeNull();
    const attributes = feature.object.attributes;
    expect(attributes).toHaveProperty('icon_symbol', '4321/icon.svg');
  });

});
