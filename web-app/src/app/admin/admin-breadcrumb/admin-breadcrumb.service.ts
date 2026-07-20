import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AdminBreadcrumb } from './admin-breadcrumb.model';

@Injectable({ providedIn: 'root' })
export class AdminBreadcrumbService {
  private breadcrumbsSubject = new BehaviorSubject<AdminBreadcrumb[]>([]);
  private actionsSubject = new BehaviorSubject<TemplateRef<unknown> | null>(null);

  breadcrumbs$ = this.breadcrumbsSubject.asObservable();
  actions$ = this.actionsSubject.asObservable();

  setBreadcrumbs(breadcrumbs: AdminBreadcrumb[]): void {
    this.breadcrumbsSubject.next(breadcrumbs);
  }

  setActions(template: TemplateRef<unknown> | null): void {
    this.actionsSubject.next(template);
  }
}
