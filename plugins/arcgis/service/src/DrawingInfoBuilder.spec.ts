// make a temporary directory to hold icon files (needs to be done before any MAGE imports)
import fs from "fs";
let tempdir:string = fs.mkdtempSync('/tmp/drawingInfoTest');
process.env.MAGE_ICON_DIR = tempdir;

// import the mock module before anything that imports mongoose
const mockingoose = require("mockingoose");

import { DrawingInfoBuilder } from "./DrawingInfoBuilder";
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from "./types/ArcGISPluginConfig";
import { Acl, MageEvent } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { Form, FormField, FormFieldType } from "@ngageoint/mage.service/lib/entities/events/entities.events.forms";
import { LineStyle } from "@ngageoint/mage.service/lib/entities/entities.global";
import { Model as IconModel } from '@ngageoint/mage.service/lib/models/icon';
import { Query } from 'mongoose';

// clean up icon directory after all tests
afterAll(() => {
  if (tempdir) {
    fs.rmSync(tempdir, { recursive: true });
  }
})

describe('feature service drawing info builder', () => {

  let simpleStyle: LineStyle = {fill: '#FACADE'} as LineStyle;
  let emptyACL: Acl = {} as Acl;
  let simpleEvent = new MageEvent({
    id: 999, name: 'test event', layerIds: [], feedIds: [], forms: [], style: simpleStyle, acl: emptyACL
  });
  let simpleForm = {
    id: 1, name: 'simple form', description: 'simple form description',
    default: false, color: '#BEADED', archived: false, userFields: [],
    fields: [{
      id: 1, archived: false, name: 'name', title: 'Name', type: FormFieldType.Text, required: false, value: null
    } as FormField]
  } as Form;
  let secondSimpleForm = {
    id: 2, name: 'simple form 2', description: 'simple form 2 description',
    default: false, color: '#DABBED', archived: false, userFields: [],
    fields: [{
      id: 1, archived: false, name: 'subject', title: 'Subject', type: FormFieldType.Text, required: false, value: null
    } as FormField]
  } as Form;
  let eventWithSimpleForm = new MageEvent({
    id: 4321, name: 'test event with simple form', layerIds: [], feedIds: [],
    forms: [simpleForm], style: simpleStyle, acl: emptyACL
  });
  let eventWithTwoForms = new MageEvent({
    id: 789, name: 'test event with 2 forms', layerIds: [], feedIds: [],
    forms: [simpleForm, secondSimpleForm], style: simpleStyle, acl: emptyACL
  });
  let config: ArcGISPluginConfig = {} as ArcGISPluginConfig;
  Object.assign(config,
    {
      ...defaultArcGISPluginConfig,
      eventIdField: 'test_event_id'
    }
  );

  beforeEach(() => { mockingoose.resetAll() })

  test('produces a simple value renderer', async () => {

    let events: MageEvent[] = [simpleEvent];

    fs.mkdirSync(`${tempdir}/999`);
    fs.writeFileSync(`${tempdir}/999/icon.svg`, '<svg/>');

    // mock the icon data that would otherwise have been loaded from MongoDB
    const iconFindMock = (query:Query<any, any>) => {
      const findQuery = query.getQuery();
      if (findQuery['eventId'] != null) {
        return [{eventId: simpleEvent.id, relativePath: `${simpleEvent.id}/icon.svg`}];
      }
      return [];
    }
    const iconFindOneMock = (query:Query<any, any>) => {
      return {eventId: simpleEvent.id, relativePath: `${simpleEvent.id}/icon.svg`};
    }

    mockingoose(IconModel).toReturn(iconFindMock, 'find');
    mockingoose(IconModel).toReturn(iconFindOneMock, 'findOne');

    const drawingInfo = await new DrawingInfoBuilder(console, config)
      .events(events)
      .build();

    expect(drawingInfo).not.toBeNull();
    expect(drawingInfo).toHaveProperty("renderer");
    const renderer = drawingInfo?.renderer;
    expect(renderer).toHaveProperty("type")
    expect(renderer?.type).toEqual("uniqueValue")
    expect(renderer?.field1).toEqual("icon_symbol");
    expect(renderer?.uniqueValueInfos).toHaveLength(1);
    const valueInfos = renderer?.uniqueValueInfos;
    expect(valueInfos[0]).toHaveProperty("value", '999/icon.svg');
    expect(renderer).toHaveProperty("defaultSymbol");
    expect(renderer?.defaultSymbol?.type).toEqual("esriPMS");
    expect(atob(renderer?.defaultSymbol?.imageData))
      .toEqual('<svg/>');
  });

  test('produces a proper renderer for an event with a form', async () => {

    let events: MageEvent[] = [eventWithSimpleForm];

    const testEventId = eventWithSimpleForm.id;

    fs.mkdirSync(`${tempdir}/${testEventId}/1`, { recursive: true });
    fs.writeFileSync(`${tempdir}/${testEventId}/icon.svg`, '<svg><text>event default</text></svg>');
    fs.writeFileSync(`${tempdir}/${testEventId}/1/icon.svg`, '<svg><text>form default</text></svg>');

    // mock the icon data that would otherwise have been loaded from MongoDB
    const iconFindOneMock = (query:Query<any, any>) => {
      const findQuery = query.getQuery();
      if (findQuery['eventId'] != null && findQuery['formId'] != null) {
        return {eventId: testEventId, relativePath: `${testEventId}/1/icon.svg`, formId: 1}
      }
      if (findQuery['eventId'] != null) {
        return {eventId: testEventId, relativePath: `${testEventId}/icon.svg`}
      }
      return null;
    }
    const iconFindMock = (query:Query<any, any>) => {
      const findQuery = query.getQuery();
      if (findQuery['eventId'] != null) {
        return [
          {eventId: testEventId, relativePath: `${testEventId}/1/icon.svg`, formId: 1},
          {eventId: testEventId, relativePath: `${testEventId}/icon.svg`, formId: null},
        ]
      }
      return [];
    }
    mockingoose(IconModel).toReturn(iconFindOneMock, 'findOne');
    mockingoose(IconModel).toReturn(iconFindMock, 'find');

    const drawingInfo = await new DrawingInfoBuilder(console, config)
      .events(events)
      .build();
    const renderer = drawingInfo?.renderer;
    expect(renderer?.uniqueValueInfos).toHaveLength(2);
    expect(renderer).toHaveProperty("defaultSymbol");
    expect(renderer?.defaultSymbol?.type).toEqual("esriPMS");
    expect(atob(renderer?.defaultSymbol?.imageData))
      .toEqual('<svg><text>event default</text></svg>');
    const valueInfos: { [key: string]: any }[] = renderer?.uniqueValueInfos;
    const values = valueInfos.map(vi => vi.value);
    expect(values).toContain(`${testEventId}/icon.svg`);
    expect(values).toContain(`${testEventId}/1/icon.svg`);
  });

  test('produces a proper renderer for an event with two forms', async () => {

    let events: MageEvent[] = [eventWithTwoForms];

    const testEventId = eventWithTwoForms.id;

    fs.mkdirSync(`${tempdir}/${testEventId}/${events[0].forms[0].id}`, { recursive: true });
    fs.mkdirSync(`${tempdir}/${testEventId}/${events[0].forms[1].id}`, { recursive: true });
    fs.writeFileSync(`${tempdir}/${testEventId}/icon.svg`, '<svg><text>event default</text></svg>');
    fs.writeFileSync(`${tempdir}/${testEventId}/${events[0].forms[0].id}/icon.svg`, '<svg><text>form 1 default</text></svg>');
    fs.writeFileSync(`${tempdir}/${testEventId}/${events[0].forms[1].id}/icon.svg`, '<svg><text>form 2 default</text></svg>');

    // mock the icon data that would otherwise have been loaded from MongoDB
    const iconFindOneMock = (query:Query<any, any>) => {
      const findQuery = query.getQuery();
      if (findQuery['eventId'] != null && findQuery['formId'] != null) {
        return {
          eventId: testEventId,
          relativePath: `${testEventId}/${findQuery['formId']}/icon.svg`,
          formId: findQuery['formId']};
      }
      if (findQuery['eventId'] != null) {
        return {eventId: testEventId, relativePath: `${testEventId}/icon.svg`}
      }
      return null;
    }
    const iconFindMock = (query:Query<any, any>) => {
      const findQuery = query.getQuery();
      if (findQuery['eventId'] != null) {
        return [
          {eventId: testEventId, relativePath: `${testEventId}/${events[0].forms[0].id}/icon.svg`, formId: events[0].forms[0].id},
          {eventId: testEventId, relativePath: `${testEventId}/${events[0].forms[1].id}/icon.svg`, formId: events[0].forms[1].id},
          {eventId: testEventId, relativePath: `${testEventId}/icon.svg`, formId: null},
        ]
      }
      return [];
    }
    mockingoose(IconModel).toReturn(iconFindOneMock, 'findOne');
    mockingoose(IconModel).toReturn(iconFindMock, 'find');

    const drawingInfo = await new DrawingInfoBuilder(console, config)
      .events(events)
      .build();
    const renderer = drawingInfo?.renderer;
    expect(renderer?.uniqueValueInfos).toHaveLength(3);
    const valueInfos: { [key: string]: any }[] = renderer?.uniqueValueInfos;
    const values = valueInfos.map(vi => vi.value);
    expect(values).toContain(`${testEventId}/icon.svg`);
    expect(values).toContain(`${testEventId}/1/icon.svg`);
    expect(values).toContain(`${testEventId}/2/icon.svg`);
  });
});
