import { FeedId } from '../feeds/entities.feeds'
import { copyFormAttrs, Form, FormField, FormId } from './entities.events.forms'
import { Team, TeamId } from '../teams/entities.teams'
import { copyLineStyleAttrs, LineStyle } from '../entities.global'

export type MageEventId = number

export interface MageEventAttrs {
  id: MageEventId
  name: string
  description?: string
  complete?: boolean
  teamIds?: TeamId[]
  teams?: Team[]
  layerIds: string[]
  feedIds: FeedId[]
  forms: Form[]
  minObservationForms?: number
  maxObservationForms?: number
  style: LineStyle
  acl: Acl
}

/**
 * A note about copying: One might think that using the spread operator `...`
 * would be a cleaner way to quickly copy objects.  However, because `MageEvent`
 * implements `MageEventAttrs`, and `MageEvent` uses accessor functions to
 * return property values, the spread operator would fail to copy those
 * properties to a new object hash.  So, to properly copy all the values of the
 * given source object, which might be class instance or an object with
 * properties on the protoype chain, the only fool-proof way is to explicitly
 * read and assign the properties of interest.
 * @param x
 * @returns
 */
export function copyMageEventAttrs(x: MageEventAttrs): MageEventAttrs {
  return {
    id: x.id,
    name: x.name,
    description: x.description,
    complete: x.complete,
    minObservationForms: x.minObservationForms,
    maxObservationForms: x.maxObservationForms,
    forms: x.forms.map(copyFormAttrs),
    layerIds: [ ...x.layerIds ],
    feedIds: [ ...x.feedIds ],
    teamIds: x.teamIds ? [ ...x.teamIds ] : undefined,
    teams: x.teams, // TODO: this might go away
    acl: copyAclAttrs(x.acl),
    style: copyLineStyleAttrs(x.style),
  }
}

export function copyAclAttrs(x: Acl): Acl {
  return Object.getOwnPropertyNames(x).reduce((acl, userId) => {
    const entry = x[userId]
    acl[userId] = {
      role: entry.role,
      permissions: entry.permissions,
    }
    return acl
  }, {} as Acl)
}

type FormFieldKey = string
function FormFieldKey(formId: FormId, fieldName: string): FormFieldKey {
  return `${formId}::${fieldName}`
}

export class MageEvent implements Readonly<MageEventAttrs> {

  #attrs: MageEventAttrs
  #formIndex: Map<FormId, Form> = new Map()
  #formFieldIndex: Map<FormFieldKey, FormField> = new Map()

  constructor(attrs: MageEventAttrs) {
    // TODO: deep copy
    this.#attrs = Object.freeze(copyMageEventAttrs(attrs))
    for (const form of attrs.forms) {
      this.#formIndex.set(form.id, form)
      for (const field of form.fields) {
        this.#formFieldIndex.set(FormFieldKey(form.id, field.name), field)
      }
    }
  }

  get id(): number { return this.#attrs.id }
  get name(): string { return this.#attrs.name }
  get description(): string | undefined { return this.#attrs.description }
  get complete(): boolean | undefined { return this.#attrs.complete }
  get teamIds(): string[] | undefined { return this.#attrs.teamIds }
  get teams(): Team[] | undefined { return this.#attrs.teams }
  get layerIds(): string[] { return this.#attrs.layerIds }
  get feedIds(): string[] { return this.#attrs.feedIds }
  get forms(): Form[] { return this.#attrs.forms }
  /**
   * Return only the forms for this event whose `archived` flag is `false`.
   */
  get activeForms(): Form[] { return this.forms.filter(x => !x.archived) }
  get archivedForms(): Form[] { return this.forms.filter(x => x.archived) }
  get minObservationForms(): number | undefined { return this.#attrs.minObservationForms }
  get maxObservationForms(): number | undefined { return this.#attrs.maxObservationForms }
  get style(): LineStyle { return this.#attrs.style }
  get acl(): Acl { return this.#attrs.acl }

  formFor(id: FormId): Form | null {
    return this.#formIndex.get(id) || null
  }

  formFieldFor(fieldName: string, formId: FormId): FormField | null {
    return this.#formFieldIndex.get(FormFieldKey(formId, fieldName)) || null
  }

  /**
   * Similarly to {@link activeForms}, return only the form fields in the
   * given form whose `archived` flag is `false` or `undefined`.
   * @param formId
   * @returns
   */
  activeFieldsForForm(formId: FormId): FormField[] | null {
    const form = this.formFor(formId)
    if (form) {
      return form.fields.filter(x => !x.archived)
    }
    return null
  }
}

export function formForId(id: FormId, mageEvent: MageEventAttrs): Form | null {
  return mageEvent.forms.find(x => x.id === id) || null
}

export enum EventAccessType {
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export enum EventRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  GUEST = 'GUEST'
}

export type EventRolePermissions = { [role in EventRole]: EventAccessType[] }

export const EventRolePermissions: EventRolePermissions = {
  OWNER: [ EventAccessType.Read, EventAccessType.Update, EventAccessType.Delete ],
  MANAGER: [ EventAccessType.Read, EventAccessType.Update ],
  GUEST: [ EventAccessType.Read ],
}

export function rolesWithPermission(permission: EventAccessType): EventRole[] {
  const roles: EventRole[] = []
  for (const key in EventRolePermissions) {
    if (EventRolePermissions[key as EventRole].indexOf(permission) !== -1) {
      roles.push(key as EventRole)
    }
  }
  return roles
}

/**
 * The ACL (access control list) structure is a dictionary whose keys are
 * user IDs, and corresponding values are the role names that define the
 * permissions the user ID has on the event.
 */
export interface Acl {
  [userId: string]: {
    role: EventRole
    permissions: EventAccessType[]
  }
}

export type MageEventCreateAttrs = Pick<MageEventAttrs, 'name' | 'description'>

export interface MageEventRepository {
  findAll(): Promise<MageEventAttrs[]>
  findById(id: MageEventId): Promise<MageEvent | null>
  findAllByIds(ids: MageEventId[]): Promise<{ [id: number]: MageEventAttrs | null }>
  /**
   * Return all the MAGE events that are not {@link MageEventAttrs.complete | complete}.
   */
  findActiveEvents(): Promise<MageEventAttrs[]>
  /**
   * Add a reference to the given feed ID on the given event.
   * @param event an Event ID
   * @param feed a Feed ID
   */
  addFeedsToEvent(event: MageEventId, ...feeds: FeedId[]): Promise<MageEventAttrs | null>
  findTeamsInEvent(event: MageEventId): Promise<Team[] | null>
  removeFeedsFromEvent(event: MageEventId, ...feeds: FeedId[]): Promise<MageEventAttrs | null>
  /**
   * Remove the given feeds from any events that reference the feed.  Return the
   * count of events the operation modified.
   * @param feed the ID of the feed to remove from events
   */
  removeFeedsFromEvents(...feed: FeedId[]): Promise<number>
}
