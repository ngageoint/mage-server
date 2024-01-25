
// observation with attachments
// observation with archived form
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

import { MageEventCreateRequest, MageClientSession, RootUserSetupRequest, UserCreateRequest, FormFieldType, MageForm, MageFormCreateRequest } from '../client'

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
    name: 'Export Form 1',
    userFields: [],
    archived: false,
    color: '#ff0000',
    fields: [
      {
        id: 1,
        name: 'field1',
        required: false,
        title: 'Field 1',
        type: FormFieldType.Text,
      },
      {
        id: 2,
        name: 'field2',
        required: false,
        title: 'Field 2',
        type: FormFieldType.Attachment,
      }
    ]
  }
]

export async function createFixtureData(rootSession: MageClientSession): Promise<void> {
  const rootSetup = await rootSession.setupRootUser(rootSeed).then(x => x.data)
  await rootSession.signIn(rootSeed.username, rootSeed.password, rootSeed.uid)
  const roles = await rootSession.listRoles().then(x => x.data)
  const userRole = roles.find(x => x.name === 'USER_ROLE')!
  const users = await Promise.all(usersSeed.map(x => rootSession.createUser({ ...x, roleId: userRole.id }).then(x => x.data)))
  console.log('USERS', users)
  const event = await rootSession.createEvent(eventSeed).then(x => x.data).catch(err => {
    console.error('EVENT', err)
  })
  console.log('EVENT', event)
}