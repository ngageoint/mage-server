import { EventTransform } from './EventTransform';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from "./types/ArcGISPluginConfig";
import { LineStyle } from "@ngageoint/mage.service/lib/entities/entities.global";
import { Acl, MageEvent } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { Form, FormField, FormFieldType } from "@ngageoint/mage.service/lib/entities/events/entities.events.forms";

describe('event transform', () => {

  const simpleStyle: LineStyle = { fill: '#FACADE' } as LineStyle;
  const emptyACL: Acl = {} as Acl;

  const simpleForm = {
    id: 1, name: 'simple form', description: 'simple form description',
    default: false, color: '#BEADED', archived: false, userFields: [],
    fields: [{
      id: 1, archived: false, name: 'location', title: 'Location', type: FormFieldType.Geometry, required: false, value: null
    } as FormField]
  } as Form;

  const eventWithForm = new MageEvent({
    id: 4321, name: 'test event with simple form', layerIds: [], feedIds: [],
    forms: [simpleForm], style: simpleStyle, acl: emptyACL
  });

  const config: ArcGISPluginConfig = { ...defaultArcGISPluginConfig } as ArcGISPluginConfig;

  it('names an attribute deterministically from the form id and field name by default', () => {
    const transform = new EventTransform(config, eventWithForm);
    const formFields = transform.get(1);
    expect(formFields).not.toBeUndefined();
    expect(formFields?.getField('location')).toEqual('form1_location');
  });

  it('uses a configured field attribute override when present', () => {
    const overrideConfig: ArcGISPluginConfig = {
      ...defaultArcGISPluginConfig,
      fieldAttributes: {
        'test event with simple form': {
          'simple form': {
            'Location': 'custom_location_attribute'
          }
        }
      }
    } as ArcGISPluginConfig;
    const transform = new EventTransform(overrideConfig, eventWithForm);
    const formFields = transform.get(1);
    expect(formFields?.getField('location')).toEqual('custom_location_attribute');
  });
});
