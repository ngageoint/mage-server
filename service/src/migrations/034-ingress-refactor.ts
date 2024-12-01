// import { Migration } from '@ngageoint/mongodb-migrations'

// /**
//  * **TODO**
//  * * rename `type` to `protocol`
//  * * rename `settings` to `protocolSettings`
//  * * migrate common policy from `authenticationconfigurations.settings` to `identity_providers` `userEnrollmentPolicy` and `deviceEnrollmentPolicy`
//  *   * usersReqAdmin, devicesReqAdmin, newUserTeams, newUserEvents
//  * * add `assignRole` with default USER_ROLE ID to `userEnrollmentPolicy`
//  * * move `authentications` to `User.ingressAccounts` array `{ identityProviderId: ObjectId, enabled: boolean, accountSettings?: Mixed }`
//  * * move `authentications` with local idp to `local_idp_accounts`
//  */
// const migration: Migration = {

//   id: 'ingress-refactor',

//   async up(done) {
//     const { db, log } = this
//     const idps = db.collection('identity_providers')
//     const localIdps = await idps.find({ type: 'local' }).toArray()
//     if (localIdps.length !== 1) {
//       return done(new Error(`unexpected `))
//     }
//     const localIdp = localIdps[0]
//     const localIdpId = localIdp._id
//   },

//   async down(done) {

//   }
// }

// export = migration