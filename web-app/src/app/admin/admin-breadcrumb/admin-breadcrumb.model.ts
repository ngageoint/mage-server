export interface AdminBreadcrumb {
  title: string;
  icon?: string;
  iconClass?: string;
  route?: string[];
  state?: AdminBreadcrumbState;
}

export interface AdminBreadcrumbState {
  name: string;
  params?: Record<string, any>;
}
