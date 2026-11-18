import { Injectable, TemplateRef, signal } from '@angular/core'
import { AdminBreadcrumb } from './admin-breadcrumb.model'

@Injectable({ providedIn: 'root' })
export class AdminBreadcrumbService {
  private readonly breadcrumbsSignal = signal<AdminBreadcrumb[]>([])
  private readonly actionsSignal = signal<TemplateRef<unknown> | null>(null)

  readonly breadcrumbs = this.breadcrumbsSignal.asReadonly()
  readonly actions = this.actionsSignal.asReadonly()

  setBreadcrumbs(breadcrumbs: AdminBreadcrumb[]): void {
    this.breadcrumbsSignal.set(breadcrumbs)
  }

  setActions(template: TemplateRef<unknown> | null): void {
    this.actionsSignal.set(template)
  }
}
