
// observation with archived form
// observation with single form
// observation with multiple forms
// observation with first form primary/variant
// observation with first form primary only
// observation with first form no icon
// observation with attachments
// observation with obsolete attachment field
// observation with invalid obsolete form data
// observation with missing attachments
// observation with corrupted attachment
// observation with primary icons
// observation with primary and secondary icons
// observation with missing icons
// observation with deleted user
// observation with deleted device
// location with icon
// location with missing icon
// location with corrupted icon

import path from 'path'
import fs_async from 'fs/promises'
import { expect } from 'chai'
import { MageEventCreateRequest, MageClientSession, RootUserSetupRequest, UserCreateRequest, FormFieldType, MageFormCreateRequest, ObservationMod, MageForm, MageEvent, ObservationProperties, MageFormEntry, MageEventPopulated, Observation } from '../client'
import { TestStack } from '../stack'

export const rootSeed: RootUserSetupRequest = {
  username: 'exports.root',
  displayName: 'Exports Root',
  password: 'exports.root.secret',
  uid: 'exports.root.device',
}

export const usersSeed: Omit<UserCreateRequest, 'roleId'>[] = Array.from({ length: 4 }).map((_, pos) => {
  const ordinal = pos + 1
  return {
    username: `user${ordinal}`,
    displayName: `Exports User ${ordinal}`,
    password: `user${ordinal}.secret_password`,
    passwordconfirm: `user${ordinal}.secret_password`,
  }
})

export const eventSeed: MageEventCreateRequest = {
  name: 'Export Me',
  style: {},
}

export const formsSeed: MageFormCreateRequest[] = [
  {
    name: 'form1',
    userFields: [],
    archived: false,
    color: '#aa0000',
    primaryField: 'form1/dropdown1',
    variantField: 'form1/dropdown2',
    primaryFeedField: 'form1/text1',
    style: {
      happy: {
        red: {},
        gold: {},
        green: {},
      },
      neutral: {
        red: {},
        gold: {},
        green: {},
      },
      sad: {
        red: {},
        gold: {},
        green: {},
      }
    },
    fields: [
      {
        id: 1,
        name: 'form1/text1',
        required: false,
        title: 'Text 1',
        type: FormFieldType.Text,
      },
      {
        id: 2,
        name: 'form1/attachment1',
        required: false,
        title: 'Attachment 1',
        type: FormFieldType.Attachment,
      },
      {
        id: 3,
        name: 'form1/dropdown1',
        required: false,
        title: 'Choice 1',
        type: FormFieldType.Dropdown,
        choices: [
          { id: 1, value: 1, title: 'happy' },
          { id: 2, value: 2, title: 'neutral' },
          { id: 3, value: 3, title: 'sad' },
        ]
      },
      {
        id: 4,
        name: 'form1/dropdown2',
        required: false,
        title: 'Choice 2',
        type: FormFieldType.Dropdown,
        choices: [
          { id: 1, value: 1, title: 'red' },
          { id: 2, value: 2, title: 'green' },
          { id: 3, value: 3, title: 'gold' },
        ]
      },
    ]
  },
  {
    name: 'form2',
    userFields: [],
    archived: false,
    color: '#00aa00',
    primaryField: 'form2/dropdown1',
    fields: [
      {
        id: 1,
        name: 'form2/text1',
        required: false,
        title: 'Text 1',
        type: FormFieldType.Text,
      },
      {
        id: 2,
        name: 'form2/attachment1',
        required: false,
        title: 'Attachment 1',
        type: FormFieldType.Attachment,
      },
      {
        id: 3,
        name: 'form2/dropdown1',
        required: false,
        title: 'Choice 1',
        type: FormFieldType.Dropdown,
        choices: [
          { id: 1, value: 1, title: 'happy' },
          { id: 2, value: 2, title: 'neutral' },
          { id: 3, value: 3, title: 'sad' },
        ]
      },
      {
        id: 4,
        name: 'form2/dropdown2',
        required: false,
        title: 'Choice 2',
        type: FormFieldType.Dropdown,
        choices: [
          { id: 1, value: 1, title: 'red' },
          { id: 2, value: 2, title: 'green' },
          { id: 3, value: 3, title: 'gold' },
        ]
      },
    ]
  },
  {
    name: 'form3',
    userFields: [],
    archived: false,
    color: '#0000aa',
    fields: [
      {
        id: 1,
        name: 'form3/field1',
        required: false,
        title: 'Field 1',
        type: FormFieldType.Text,
      },
      {
        id: 2,
        name: 'form3/field2',
        required: false,
        title: 'Field 2',
        type: FormFieldType.Attachment,
      },
    ]
  },
  {
    name: 'form4',
    userFields: [],
    archived: false,
    color: '#00aa00',
    primaryField: 'form4/dropdown1',
    fields: [
      {
        id: 1,
        name: 'form4/text1',
        required: false,
        title: 'Text 1',
        type: FormFieldType.Text,
      },
      {
        id: 2,
        name: 'form4/attachment1',
        required: false,
        title: 'Attachment 1',
        type: FormFieldType.Attachment,
      },
      {
        id: 3,
        name: 'form4/dropdown1',
        required: false,
        title: 'Choice 1',
        type: FormFieldType.Dropdown,
        choices: [
          { id: 1, value: 1, title: 'happy' },
          { id: 2, value: 2, title: 'neutral' },
          { id: 3, value: 3, title: 'sad' },
        ]
      },
    ]
  },
]

export type ObservationSeed = Omit<ObservationMod, 'eventId' | 'properties'> & {
  id: null
  properties: ObservationSeedProperties
}

export type ObservationSeedProperties = Omit<ObservationProperties, 'forms'> & {
  forms: MageFormEntrySeed[]
}

export type MageFormEntrySeed = Omit<MageFormEntry, 'formId'> & {
  formName: string
}

export function observationModForSeed(seed: ObservationSeed, event: MageEvent | MageEventPopulated): ObservationMod {
  const formsByName = event.forms.reduce((forms, form) => {
    return { ...forms, [form.name]: form }
  }, {} as { [name: string]: MageForm })
  return {
    ...seed,
    eventId: event.id,
    properties: {
      ...seed.properties,
      forms: seed.properties.forms.map(x => ({ ...x, formId: formsByName[x.formName].id })),
    },
  }
}

type ObservationTestCases = {
  singleForm: true,
  multipleForms: true,
  unpopulatedIconFields: true,
  noIcons: true,
  archivedFormWithIcons: true,
  archivedFormWithoutIcons: true,
  activeFormAndArchivedForm: true,
}
type ObservationTestCasesSeed = Record<keyof ObservationTestCases, ObservationSeed>
type ObservationTestCasesSaved = Record<keyof ObservationTestCases, Observation>

export const observationSeed: ObservationTestCasesSeed = {
  singleForm: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -1.252441, 51.743745 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form1',
          'form1/dropdown1': 'happy',
          'form1/dropdown2': 'gold',
        },
      ]
    }
  },
  multipleForms: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -1.256441, 51.733745 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form1',
          'form1/dropdown1': 'sad',
          'form1/dropdown2': 'gold',
        },
        {
          formName: 'form1',
          'form1/dropdown1': 'happy',
          'form1/dropdown2': 'green',
        },
      ]
    }
  },
  unpopulatedIconFields: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -1.250441, 51.733745 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form1',
          'form1/text1': 'wut is this',
        },
        {
          formName: 'form1',
          'form1/text1': 'hiiyooooo'
        },
      ]
    }
  },
  noIcons: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -1.252441, 51.733745 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form2',
          'form1/dropdown1': 'sad',
          'form1/dropdown2': 'gold',
        },
      ]
    }
  },
  archivedFormWithIcons: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -1.252441, 51.731745 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form4',
          'form1/dropdown1': 'happy',
          'form1/dropdown2': 'green',
        },
      ]
    }
  },
  archivedFormWithoutIcons: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -1.253441, 51.734745 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form4',
          'form1/dropdown1': 'happy',
          'form1/dropdown2': 'red',
        },
      ]
    }
  },
  activeFormAndArchivedForm: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -1.251441, 51.733745 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form1',
          'form1/dropdown1': 'neutral',
          'form1/dropdown2': 'red',
        },
        {
          formName: 'form4',
          'form1/dropdown1': 'happy',
          'form1/dropdown2': 'green',
        },
      ]
    }
  }
}

const deletedUserObservationSeed: ObservationSeed = {
  id: null,
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [ -1.256441, 51.723745 ] },
  properties: {
    timestamp: new Date().toISOString(),
    forms: [
      {
        formName: 'form1',
        'form1/dropdown1': 'sad',
        'form1/dropdown2': 'gold',
      },
      {
        formName: 'form1',
        'form1/dropdown1': 'happy',
        'form1/dropdown2': 'green',
      },
    ]
  }
}

export async function populateFixtureData(stack: TestStack, rootSession: MageClientSession): Promise<void> {

  const roles = await rootSession.listRoles().then(x => x.data)
  const userRole = roles.find(x => x.name === 'USER_ROLE')!

  expect(userRole, 'failed to find user role').to.exist

  const users = await Promise.all(usersSeed.map(x => rootSession.createUser({ ...x, roleId: userRole.id }).then(x => x.data)))

  expect(users.length).to.equal(usersSeed.length)

  const event = await rootSession.createEvent(eventSeed).then(x => x.data)

  expect(event.id).to.be.a('number')

  const forms = await Promise.all(formsSeed.map(x => rootSession.createForm(event.id, x).then(x => x.data)))
  const formsByName = Object.fromEntries(forms.map(x => [ x.name, x ]))
  const eventWithForms = await rootSession.readEvent(event.id).then(x => x.data)
  await Promise.all(users.map(user => rootSession.addParticipantToEvent(eventWithForms, user.id)))

  const assetsDirPath = path.resolve(__dirname, '..', 'assets')
  const primaryValues = [ 'happy', 'neutral', 'sad' ]
  const variantValues = [ 'red', 'gold', 'green' ]
  const allCombos = primaryValues.flatMap(primary => variantValues.map(variant => [ primary, variant ]))
  await Promise.all(
    allCombos.map(([ primary, variant ]) => {
      const iconName = `${primary}_${variant}.png`
      const iconPath = path.resolve(assetsDirPath, iconName)
      return rootSession.saveMapIcon(iconPath, event.id, formsByName.form1.id, primary, variant)
    })
  )
  await rootSession.saveMapIcon(path.resolve(assetsDirPath, 'happy_green.png'), event.id, formsByName.form4.id)
  // TODO: add icons to form4
  for (const [ primary, variant ] of allCombos) {
    const savedIconPath = path.resolve(stack.appDataPath, 'icons', String(event.id), String(forms[0].id), primary, variant, 'icon.png')
    const savedIconStats = await fs_async.stat(savedIconPath)

    expect(savedIconStats.isFile(), `saved icon ${savedIconPath} does not exist`).to.be.true
  }

  const user1Session = new MageClientSession(rootSession.mageUrl)
  const user1SignInError = await user1Session.signIn(users[0].username, usersSeed[0].password, rootSeed.uid)

  expect(user1SignInError).not.to.exist

  const observations = await Promise.all(Object.entries(observationSeed).map(([name, seed]) => {
    const mod = observationModForSeed(seed, eventWithForms)
    return user1Session.saveObservation(mod, []).then(x => [ name, x ] as [ string, Observation ])
  }))
  const observationTestCases: ObservationTestCasesSaved = Object.fromEntries(observations) as ObservationTestCasesSaved

  const now = Date.now()
  for (const obs of observations) {
    expect(new Date(obs[1].createdAt).getTime()).to.be.closeTo(now, 150)
  }

  const archivedForm = await rootSession.archiveForm(eventWithForms, formsByName.form4.id).then(x => x.data)

  expect(archivedForm.name).to.equal('form4')
  expect(archivedForm.archived).to.be.true

  const allObs = await user1Session.readObservations(event.id)
  console.info(allObs)
}
