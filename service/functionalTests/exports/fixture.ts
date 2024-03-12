
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
import fs from 'fs'
import fs_async from 'fs/promises'
import { expect } from 'chai'
import { MageEventCreateRequest, MageClientSession, RootUserSetupRequest, UserCreateRequest, FormFieldType, MageFormCreateRequest, ObservationMod, MageForm, MageEvent, MageEventPopulated, Observation, AttachmentModAction, AttachmentMod, ObservationPropertiesMod, MageFormEntryMod, createBlobDuck, DeviceCreateRequest, Device, AuthenticationStrategy, AuthenticationProvider, LocalAuthenticationProviderSettings, SignInResult } from '../client'
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

type DeviceSeed = Omit<DeviceCreateRequest, 'userId'> & {
  username: string
}

export const devicesSeed: Omit<DeviceSeed, 'userId'>[] = [
  { uid: 'user1-device1', username: 'user1' },
  { uid: 'user3-device1', username: 'user3' },
  { uid: 'user3-device2', username: 'user3' },
]

export const eventSeed: MageEventCreateRequest = {
  name: 'Export Me',
  style: {},
}

export const eventUnsafeNameSeed: MageEventCreateRequest = {
  name: '/tmp/etc/passwd',
  style: {}
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
      {
        id: 5,
        archived: true,
        name: 'form1/dropdown3',
        required: false,
        title: 'Choice 2',
        type: FormFieldType.Dropdown,
        choices: [
          { id: 1, value: 1, title: 'red' },
          { id: 2, value: 2, title: 'green' },
          { id: 3, value: 3, title: 'gold' },
        ]
      }
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
        name: 'form3/multiselect1',
        required: false,
        title: 'Multi-Select 1',
        type: FormFieldType.MultiSelectDropdown,
        choices: [
          { id: 1, value: 1, title: 'a' },
          { id: 2, value: 2, title: 'b' },
          { id: 3, value: 3, title: 'c' },
          { id: 4, value: 4, title: 'd' },
        ]
      },
      {
        id: 2,
        name: 'form3/attachment1',
        required: false,
        title: 'Attachment 1',
        type: FormFieldType.Attachment,
      },
    ]
  },
  {
    name: 'archivedForm',
    userFields: [],
    archived: false,
    color: '#00aa00',
    primaryField: 'archivedForm/dropdown1',
    fields: [
      {
        id: 1,
        name: 'archivedForm/text1',
        required: false,
        title: 'Text 1',
        type: FormFieldType.Text,
      },
      {
        id: 2,
        name: 'archivedForm/attachment1',
        required: false,
        title: 'Attachment 1',
        type: FormFieldType.Attachment,
      },
      {
        id: 3,
        name: 'archivedForm/dropdown1',
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
  {
    name: 'volatile',
    userFields: [],
    color: '#343411',
    archived: false,
    primaryField: 'tricksie',
    fields: [
      {
        id: 1,
        name: 'tricksie',
        type: FormFieldType.Dropdown,
        title: 'Happiness is fleeting',
        required: false,
        choices: [
          { id: 1, value: 1, title: 'happy' },
          { id: 2, value: 2, title: 'neutral' },
          { id: 3, value: 3, title: 'sad' },
        ],
      },
      {
        id: 2,
        name: 'ghost',
        type: FormFieldType.Dropdown,
        title: 'Poof',
        required: false,
        choices: [
          { id: 1, value: 1, title: 'red' },
          { id: 2, value: 2, title: 'green' },
          { id: 3, value: 3, title: 'gold' },
        ]
      }
    ]
  }
]

export type ObservationSeed = Omit<ObservationMod, 'eventId' | 'properties'> & {
  id: null
  properties: ObservationSeedProperties
}

export type ObservationSeedProperties = Omit<ObservationPropertiesMod, 'forms'> & {
  forms: MageFormEntrySeed[]
}

export type MageFormEntrySeed = Omit<MageFormEntryMod, 'formId'> & {
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
  formWithoutIcons: true,
  archivedFormWithIcons: true,
  archivedFormWithoutIcons: true,
  activeFormAndArchivedForm: true,
  withAttachmentsOnOneForm: true,
  withAttachmentsOnMultipleForms: true,
  withMissingAttachment: true,
  withAttachmentsAndNoIcons: true,
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
          'form1/text1': 'look at this',
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
  formWithoutIcons: {
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
          formName: 'archivedForm',
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
          formName: 'archivedForm',
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
          formName: 'archivedForm',
          'archivedForm/text1': 'used to be somebody',
          'archivedForm/dropdown1': 'happy',
        },
        {
          formName: 'form1',
          'form1/dropdown1': 'sad',
          'form1/dropdown2': 'green',
        },
      ]
    }
  },
  withAttachmentsOnOneForm: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -0.075291, 51.505568 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form1',
          'form1/dropdown1': 'neutral',
          'form1/dropdown2': 'red',
          'form1/attachment1': [
            {
              action: AttachmentModAction.Add,
              name: 'tower bridge 1.jpeg',
              contentType: 'image/jpeg'
            } as AttachmentMod,
            {
              action: AttachmentModAction.Add,
              name: 'tower bridge 2.jpeg',
              contentType: 'image/jpeg'
            } as AttachmentMod,
          ]
        }
      ]
    },
  },
  withAttachmentsOnMultipleForms: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -79.076874, 43.084346 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form1',
          'form1/dropdown1': 'neutral',
          'form1/dropdown2': 'gold',
          'form1/attachment1': [
            {
              action: AttachmentModAction.Add,
              name: 'niagra1.jpeg',
              contentType: 'image/jpeg'
            }
          ]
        },
        {
          formName: 'form1',
          'form1/dropdown1': 'happy',
          'form1/dropdown2': 'gold',
          'form1/attachment1': [
            {
              action: AttachmentModAction.Add,
              name: 'niagra2.jpeg',
              contentType: 'image/jpeg',
            }
          ]
        }
      ]
    },
  },
  withMissingAttachment: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -103.460999, 26.257522 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form2',
          'form2/attachment1': [
            {
              action: AttachmentModAction.Add,
              name: 'never uploaded.jpeg',
              contentType: 'image/jpeg'
            }
          ]
        },
        {
          formName: 'form2',
          'form2/dropdown1': 'happy',
          'form2/dropdown2': 'gold',
          'form2/attachment1': [
            {
              action: AttachmentModAction.Add,
              name: 'axolotl.jpeg',
              contentType: 'image/jpeg',
            }
          ]
        }
      ]
    },
  },
  withAttachmentsAndNoIcons: {
    id: null,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ -1.511540, 48.635837 ] },
    properties: {
      timestamp: new Date().toISOString(),
      forms: [
        {
          formName: 'form2',
          'form2/attachment1': [
            {
              action: AttachmentModAction.Add,
              name: 'mont saint michel.jpeg',
              contentType: 'image/jpeg'
            }
          ]
        },
        {
          formName: 'form3',
          'form3/multiselect1': [ 'a', 'c' ],
          'form3/attachment1': [
            {
              action: AttachmentModAction.Add,
              name: 'axolotl.jpeg',
              contentType: 'image/jpeg',
            }
          ]
        }
      ]
    },
  },
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

const deletedDeviceObservationSeed: ObservationSeed = {
  id: null,
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [ 2.912404, 39.719863 ] },
  properties: {
    timestamp: new Date().toISOString(),
    forms: [
      {
        formName: 'form1',
        'form1/dropdown1': 'neutral',
        'form1/dropdown2': 'green'
      }
    ]
  }
}

const invalidFormEntryObservationSeed: ObservationSeed = {
  id: null,
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [ 2.910519, 39.642380 ] },
  properties: {
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    forms: [
      {
        formName: 'volatile',
        tricksie: 'happy',
        ghost: 'green',
      }
    ]
  }
}

export async function populateFixtureData(stack: TestStack, rootSession: MageClientSession): Promise<ExportTestFixture> {

  const assetsDirPath = path.resolve(__dirname, '..', 'assets')

  const roles = await rootSession.listRoles().then(x => x.data)
  const userRole = roles.find(x => x.name === 'USER_ROLE')!

  expect(userRole, 'failed to find user role').to.exist

  const userIcons = [ 'blue', 'green', 'pink' ].map(color => {
    const iconName = `person_${color}.png`
    const iconPath = path.join(assetsDirPath, iconName)
    return createBlobDuck(fs.createReadStream(iconPath), iconName, 'image/png')
  })
  const users = await Promise.all(
    usersSeed.map((userSeed, index) => {
      return rootSession.createUser({ ...userSeed, roleId: userRole.id }, userIcons[index]).then(x => x.data)
    })
  )

  expect(users.length).to.equal(usersSeed.length)

  const devices = await Promise.all(
    devicesSeed.map((deviceSeed) => {
      const deviceUser = users.find(x => x.username === deviceSeed.username)
      return rootSession.createDevice({
        uid: deviceSeed.uid,
        userId: deviceUser!.id
      })
      .then(x => x.data)
    })
  )
  const devicesByUid = devices.reduce((devicesByUid, device) => ({ ...devicesByUid, [device.uid]: device }), {} as { [uid: string]: Device })

  const event = await rootSession.createEvent(eventSeed).then(x => x.data)

  expect(event.id).to.be.a('number')

  const forms = await Promise.all(formsSeed.map(x => rootSession.createForm(event.id, x).then(x => x.data)))
  const formsByName = Object.fromEntries(forms.map(x => [ x.name, x ]))
  const eventWithForms = await rootSession.readEvent(event.id).then(x => x.data)
  await Promise.all(users.map(user => rootSession.addParticipantToEvent(eventWithForms, user.id)))

  const primaryValues = [ 'happy', 'neutral', 'sad' ]
  const variantValues = [ 'red', 'gold', 'green' ]
  const allCombos = primaryValues.flatMap(primary => variantValues.map(variant => [ primary, variant ]))
  await Promise.all(
    allCombos.map(([ primary, variant ]) => {
      const iconName = `${primary}_${variant}.png`
      const iconPath = path.join(assetsDirPath, iconName)
      return rootSession
        .saveMapIcon(iconPath, event.id, formsByName.form1.id, primary, variant)
        .then(() => rootSession.saveMapIcon(iconPath, event.id, formsByName.volatile.id, primary, variant))
    })
  )
  await Promise.all(
    primaryValues.map(primary => {
      const iconName = `${primary}_green.png`
      const iconPath = path.join(assetsDirPath, iconName)
      return rootSession.saveMapIcon(iconPath, event.id, formsByName.archivedForm.id, primary)
    })
  )
  await rootSession.saveMapIcon(path.join(assetsDirPath, 'happy_green.png'), event.id, formsByName.archivedForm.id)
  for (const [ primary, variant ] of allCombos) {
    const savedIconPath = path.join(stack.appDataPath, 'icons', String(event.id), String(formsByName.form1.id), primary, variant, 'icon.png')
    const savedIconStats = await fs_async.stat(savedIconPath)

    expect(savedIconStats.isFile(), `saved icon ${savedIconPath} does not exist`).to.be.true
  }
  await Promise.all(
    [ 'happy_green', 'neutral_gold', 'sad_red' ].map(iconName => {
      const iconPath = path.join(assetsDirPath, `${iconName}.png`)
      return rootSession.saveMapIcon(iconPath, event.id, formsByName.volatile.id, iconName)
    })
  )

  const user1Session = new MageClientSession(rootSession.mageUrl)
  const user1SignIn = await user1Session.signIn(users[0].username, usersSeed[0].password, rootSeed.uid)

  expect(user1SignIn).not.to.be.instanceOf(Error)

  const observations = await Promise.all(Object.entries(observationSeed).map(([ name, seed ]) => {
    const mod = observationModForSeed(seed, eventWithForms)
    return user1Session.saveObservation(mod, []).then(obs => {
      // upload the attachment(s) content to the saved observation
      console.info(`uploading ${obs.attachments.length} attachments for observation ${name}`)
      return Promise.all(
        obs.attachments.map(async attachment => {
          const contentPath = path.join(assetsDirPath, String(attachment.name))
          console.info(`uploading attachment content for observation ${obs.id}:`, contentPath)
          try {
            const content = fs.createReadStream(contentPath)
            return await user1Session.saveAttachmentContent(content, attachment, obs)
          }
          catch (err) {
            console.warn(`skipping attachment upload for absent file:`, contentPath)
          }
          return
        }, [] as Promise<any>[])
      )
      .then(async () => {
        const finalObs = await user1Session.readObservation(event.id, obs.id)
        return [ name, finalObs ] as [ string, Observation ]
      })
    })
  }))
  const observationTestCases: ObservationTestCasesSaved = Object.fromEntries(observations) as ObservationTestCasesSaved

  const now = Date.now()
  for (const obs of observations) {
    expect(new Date(obs[1].createdAt).getTime()).to.be.closeTo(now, 500)
  }

  const archivedForm = await rootSession.archiveForm(eventWithForms, formsByName.archivedForm.id).then(x => x.data)

  expect(archivedForm.name).to.equal('archivedForm')
  expect(archivedForm.archived).to.be.true

  const user2Session = new MageClientSession(rootSession.mageUrl)
  const user2SignIn = await user2Session.signIn(usersSeed[1].username, usersSeed[1].password, rootSeed.uid)

  expect(user2SignIn).not.to.be.instanceOf(Error)

  const deletedUserObservation = await user2Session.saveObservation(observationModForSeed(deletedUserObservationSeed, eventWithForms))

  expect(new Date(deletedUserObservation.createdAt).getTime()).to.be.closeTo(Date.now(), 100)

  const userDeleted = await rootSession.deleteUser(user2Session.user!.id)

  expect(userDeleted.status).to.equal(204)

  const user3Session = new MageClientSession(stack.mageUrl)
  await user3Session.signIn(usersSeed[2].username, usersSeed[2].password, 'user3-device1')
  await user3Session.postUserLocations(event.id, [
    [ 3.017120, 39.875000, Date.now() - 1000 * 60 * 60 * 24 * 7 ],
    [ 3.017120, 39.820000, Date.now() - 1000 * 60 * 60 * 24 * 7 + 30000 ]
  ])
  await user3Session.saveObservation(observationModForSeed(deletedDeviceObservationSeed, eventWithForms))
  await user3Session.saveObservation(observationModForSeed(invalidFormEntryObservationSeed, eventWithForms))
  await rootSession.deleteDevice(devicesByUid['user3-device1'].id)

  const volatileForm = { ...formsByName.volatile }
  const tricksieField = { ...volatileForm.fields[0] }
  tricksieField.choices = tricksieField.choices?.slice(1)
  volatileForm.fields = [
    tricksieField,
    {
      id: 3,
      name: 'violator',
      title: 'Invalidating Your Data',
      type: FormFieldType.Text,
      required: true
    }
  ]
  const volatileFormMod = await rootSession.updateForm(event.id, volatileForm)

  expect(volatileFormMod.status).to.equal(200)
  expect(volatileFormMod.data.fields).to.have.length(2)

  const allObs = await user1Session.readObservations(event.id)
  console.info('all observations', allObs)

  expect(allObs.length).to.equal(Object.keys(observationTestCases).length + 3)

  const finalEvent = await rootSession.readEvent(event.id).then(res => res.data)

  // TODO: add locations
  const user1Locations = Array.from({ length: 9 }).reduce((locations: Array<[number, number, number]>, empty: unknown, index: number): Array<[number, number, number]> => {
    const prevLoc = locations[index]
    const nextLoc = [ prevLoc[0] - 0.0001, prevLoc[1] + Math.random(), prevLoc[2] + 60000 ] as [ number, number, number ]
    return [ ...locations, nextLoc ]
  }, [ [ 31.069164, 31.366097, Date.now() ] ] as Array<[number, number, number]>)
  const user1LocationsRes = await user1Session.postUserLocations(event.id, user1Locations)

  expect(user1LocationsRes.status).to.equal(200)
  expect(user1LocationsRes.data).to.have.length(10)

  const user4Locations = Array.from({ length: 9 }).reduce((locations: Array<[number, number, number]>, empty: unknown, index: number): Array<[number, number, number]> => {
    const prevLoc = locations[index]
    const nextLoc = [ prevLoc[0] - 0.0001, prevLoc[1] + Math.random(), prevLoc[2] + 60000 ] as [ number, number, number ]
    return [ ...locations, nextLoc ]
  }, [ [ 31.757698, 22.444985, Date.now() ] ] as Array<[number, number, number]>)
  const user4Session = new MageClientSession(stack.mageUrl)
  await user4Session.signIn(usersSeed[3].username, usersSeed[3].password, rootSeed.uid)
  const user4LocationsRes = await user4Session.postUserLocations(event.id, user4Locations)

  expect(user4LocationsRes.status).to.equal(200)
  expect(user4LocationsRes.data).to.have.length(10)

  const defaultLocalAuth = await rootSession.readAuthenticationProviders().then(res => res.data.find(x => x.type === AuthenticationStrategy.Local && x.name === 'local') as AuthenticationProvider<LocalAuthenticationProviderSettings>)

  expect(defaultLocalAuth, 'no default local auth provider').to.exist

  const deviceFreeLocalAuthSeed: AuthenticationProvider<LocalAuthenticationProviderSettings> = {
    ...defaultLocalAuth,
    title: 'Local Without Device Verification',
    settings: {
      ...defaultLocalAuth?.settings,
      devicesReqAdmin: { enabled: false }
    }
  }
  const deviceFreeLocalAuth = await rootSession.updateAuthenticationProvider(deviceFreeLocalAuthSeed).then(x => x.data)

  expect(deviceFreeLocalAuth._id).to.equal(defaultLocalAuth._id)
  expect(deviceFreeLocalAuth.settings.devicesReqAdmin?.enabled).to.be.false

  const user4SessionNoDevice = new MageClientSession(stack.mageUrl)
  const user4SignInNoDevice = await user4SessionNoDevice.signIn(usersSeed[3].username, usersSeed[3].password) as SignInResult

  expect(user4SignInNoDevice.device?.uid).not.to.exist

  const user4LocationNoDevice = await user4SessionNoDevice.postUserLocations(event.id, [ [ -155.233088, 19.426449 ] ])

  expect(user4LocationNoDevice.status).to.equal(200)
  expect(user4LocationNoDevice.data).to.have.length(1)
  expect(user4LocationNoDevice.data[0].properties.devicedId).to.not.exist

  const eventWithUnsafeName = await rootSession.createEvent(eventUnsafeNameSeed)
    .then(x => rootSession.readEvent(x.data.id)).then(x => x.data)
    .then(unsafeEvent => rootSession.createForm(unsafeEvent.id, formsSeed[0]).then(() => unsafeEvent))
    .then(unsafeEvent => rootSession.addParticipantToEvent(unsafeEvent, users[0].id).then(() => unsafeEvent))
    .then(unsafeEvent => rootSession.readEvent(unsafeEvent.id).then(res => res.data))
  await user1Session.postUserLocations(eventWithUnsafeName.id, [
    [ 30, 40, Date.now() ]
  ])

  return {
    event: finalEvent,
    eventWithUnsafeName,
  }
}

export interface ExportTestFixture {
  event: MageEventPopulated,
  eventWithUnsafeName: MageEventPopulated
}
