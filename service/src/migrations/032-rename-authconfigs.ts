// import { Migration } from '@ngageoint/mongodb-migrations'

// const migration: Migration = {

//   id: 'rename-authconfigs',

//   up: async function(done) {
//     this.log('rename authenticationconfigurations to identity_providers')
//     try {
//       await this.db.renameCollection('authenticationconfigurations', 'identity_providers')
//       done(null)
//     }
//     catch (err) {
//       done(err)
//     }
//     done(null)
//   },

//   down: async function(done) {
//     this.log('rename identity_providers to authenticationconfigurations')
//     try {
//       await this.db.renameCollection('identity_providers', 'authenticationconfigurations')
//       done(null)
//     }
//     catch (err) {
//       done(err)
//     }
//   }
// }

// export = migration