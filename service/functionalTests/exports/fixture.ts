
// observation with attachments
// observation with archived form
// observation with invalid obsolete form data
// observation with missing attachments
// observation with corrupted attachment
// observation with icons
// observation with missing icons
// observation with deleted user
// observation with deleted device
// location with icon
// location with missing icon
// location with corrupted icon

import { RootUserSetupRequest } from '../client'

export const root: RootUserSetupRequest = {
  username: 'exports.root',
  displayName: 'Exports Root',
  password: 'exports.root.secret',
  uid: 'exports.root.device',
}

