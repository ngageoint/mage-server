
import { expect } from 'chai'
import {
  MageClientSession,
  RootUserSetupRequest,
  MageEventCreateRequest,
  MageFormCreateRequest,
  MageEventPopulated,
  MageForm,
  Observation,
  FormFieldType,
} from '../client'

export const rootSeed: RootUserSetupRequest = {
  username: 'obs.root',
  displayName: 'Observations Root',
  password: 'obs.root.secret',
  uid: 'obs.root.device',
}

export const eventSeed: MageEventCreateRequest = {
  name: 'Observation Test Event',
  style: {},
}

export const formSeed: MageFormCreateRequest = {
  name: 'obs_form',
  userFields: [],
  archived: false,
  color: '#aa0000',
  fields: [
    {
      id: 1,
      name: 'title',
      required: false,
      title: 'Title',
      type: FormFieldType.Text,
    },
  ],
}

export interface ObservationFixture {
  event: MageEventPopulated
  form: MageForm
  observation: Observation
}

export async function populateFixtureData(rootSession: MageClientSession): Promise<ObservationFixture> {

  const event = await rootSession.createEvent(eventSeed).then(x => x.data)

  expect(event.id).to.be.a('number')

  const form = await rootSession.createForm(event.id, formSeed).then(x => x.data)
  const eventWithForms = await rootSession.readEvent(event.id).then(x => x.data)
  await rootSession.addParticipantToEvent(eventWithForms, rootSession.user!.id)

  const observation = await rootSession.saveObservation({
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-104.9352, 39.6285] },
    eventId: event.id,
    properties: {
      timestamp: new Date().toISOString(),
      forms: [{ formId: form.id, title: 'Test Observation' }],
    },
  })

  expect(observation.id).to.be.a('string')

  return { event: eventWithForms, form, observation }
}
