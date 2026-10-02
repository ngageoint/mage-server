import { Acl, EventRole, EventRolePermissions, MageEventId } from '../../entities/events/entities.events'
import { EventAclRepository } from '../../entities/events/entities.events.acl'
import { UserId } from '../../entities/users/entities.users'
import { MageEventDocument, MageEventModel } from './adapters.events.db.mongoose'

export class MongooseEventAclRepository implements EventAclRepository {

  constructor(readonly model: MageEventModel) {}

  async setUserRole(event: MageEventId, user: UserId, role: EventRole): Promise<Acl | null> {
    const updated = await this.model.findByIdAndUpdate(event, { $set: { [`acl.${user}`]: role } }, { new: true })
    return updated ? aclForDocument(updated) : null
  }

  async removeUser(event: MageEventId, user: UserId): Promise<Acl | null> {
    const updated = await this.model.findByIdAndUpdate(event, { $unset: { [`acl.${user}`]: true } }, { new: true })
    return updated ? aclForDocument(updated) : null
  }
}

function aclForDocument(doc: MageEventDocument): Acl {
  return Object.entries(doc.acl || {}).reduce((acl, [ userId, role ]) => {
    acl[userId] = { role, permissions: [ ...EventRolePermissions[role] ] }
    return acl
  }, {} as Acl)
}
