import { RawParams, StateOrName } from '@uirouter/core';

export interface AdminBreadcrumb {
  title: string;
  icon?: string;
  iconClass?: string;
  route?: string[];
  state?: AdminBreadcrumbState;
}

export interface AdminBreadcrumbState {
  name: StateOrName;
  params?: RawParams;
}
