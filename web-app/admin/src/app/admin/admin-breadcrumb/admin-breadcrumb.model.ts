import { RawParams, StateOrName } from '@uirouter/angular';

export interface AdminBreadcrumb {
  title: string
  icon?: string
  iconClass?: string
  state?: AdminBreadcrumbState
}

export interface AdminBreadcrumbState {
  name: StateOrName,
  params?: RawParams
}