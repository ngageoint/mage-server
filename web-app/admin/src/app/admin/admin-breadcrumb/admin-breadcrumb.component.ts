import { Component, Input } from '@angular/core';
import { AdminBreadcrumb } from './admin-breadcrumb.model';
import { StateService } from '@uirouter/angular';

@Component({
  selector: 'admin-breadcrumb',
  templateUrl: './admin-breadcrumb.component.html',
  styleUrls: ['./admin-breadcrumb.component.scss']
})
export class AdminBreadcrumbComponent {
  @Input() icon: string
  @Input() breadcrumbs: AdminBreadcrumb[]

  constructor(private stateService: StateService) {}

  goToBreadcrumb(breadcrumb: AdminBreadcrumb): void {
    if (breadcrumb.state) {
      this.stateService.go(breadcrumb.state.name, breadcrumb.state.params)
    }
  }
}
