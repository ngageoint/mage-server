
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
import { expect } from 'chai'
import { MageEventCreateRequest, MageClientSession, RootUserSetupRequest, UserCreateRequest, FormFieldType, MageFormCreateRequest } from '../client'

export const rootSeed: RootUserSetupRequest = {
  username: 'exports.root',
  displayName: 'Exports Root',
  password: 'exports.root.secret',
  uid: 'exports.root.device',
}

export const usersSeed: Omit<UserCreateRequest, 'roleId'>[] = Array.from({ length: 4 }).map((_, pos) => {
  const ordinal = pos + 1
  return {
    username: `exports.user${ordinal}`,
    displayName: `Exports User ${ordinal}`,
    password: `exports.user${ordinal}.secret`,
    passwordconfirm: `exports.user${ordinal}.secret`,
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
    primaryField: 'form1.dropdown1',
    variantField: 'form1.dropdown2',
    primaryFeedField: 'form1.text1',
    style: {
      red: {
        happy: { },
        neutral: {},
        sad: {}
      },
      green: {
        happy: {},
        neutral: {},
        sad: {}
      },
      yellow: {
        happy: {},
        neutral: {},
        sad: {}
      }
    },
    fields: [
      {
        id: 1,
        name: 'form1.text1',
        required: false,
        title: 'Text 1',
        type: FormFieldType.Text,
      },
      {
        id: 2,
        name: 'form1.attachment1',
        required: false,
        title: 'Attachment 1',
        type: FormFieldType.Attachment,
      },
      {
        id: 3,
        name: 'form1.dropdown1',
        required: false,
        title: 'Choice 1',
        type: FormFieldType.Dropdown,
        choices: [
          { id: 1, value: 1, title: 'red' },
          { id: 2, value: 2, title: 'green' },
          { id: 3, value: 3, title: 'yellow' },
        ]
      },
      {
        id: 4,
        name: 'form1.dropdown2',
        required: false,
        title: 'Choice 2',
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
    name: 'form2',
    userFields: [],
    archived: false,
    color: '#00aa00',
    primaryField: 'form2.dropdown1',
    fields: [
      {
        id: 1,
        name: 'form2.text1',
        required: false,
        title: 'Text 1',
        type: FormFieldType.Text,
      },
      {
        id: 2,
        name: 'form2.attachment1',
        required: false,
        title: 'Attachment 1',
        type: FormFieldType.Attachment,
      },
      {
        id: 3,
        name: 'form2.dropdown1',
        required: false,
        title: 'Choice 1',
        type: FormFieldType.Dropdown,
        choices: [
          { id: 1, value: 1, title: 'red' },
          { id: 2, value: 2, title: 'green' },
          { id: 3, value: 3, title: 'yellow' },
        ]
      },
      {
        id: 4,
        name: 'form2.dropdown2',
        required: false,
        title: 'Choice 2',
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
    name: 'form3',
    userFields: [],
    archived: false,
    color: '#0000aa',
    fields: [
      {
        id: 1,
        name: 'form3.field1',
        required: false,
        title: 'Field 1',
        type: FormFieldType.Text,
      },
      {
        id: 2,
        name: 'form3.field2',
        required: false,
        title: 'Field 2',
        type: FormFieldType.Attachment,
      }
    ]
  },
]

export async function populateFixtureData(rootSession: MageClientSession): Promise<void> {

  const roles = await rootSession.listRoles().then(x => x.data)
  const userRole = roles.find(x => x.name === 'USER_ROLE')!

  expect(userRole, 'failed to find user role').to.exist

  const users = await Promise.all(usersSeed.map(x => rootSession.createUser({ ...x, roleId: userRole.id }).then(x => x.data)))

  expect(users.length).to.equal(usersSeed.length)

  const event = await rootSession.createEvent(eventSeed).then(x => x.data)

  expect(event.id).to.be.a('number')

  const forms = await Promise.all(formsSeed.map(x => rootSession.createForm(event.id, x).then(x => x.data)))

  const assetsDirPath = path.resolve(__dirname, '..', 'assets')
  await rootSession.saveMapIcon(path.resolve(assetsDirPath, 'happy_red.png'), event.id, forms[0].id)
}
