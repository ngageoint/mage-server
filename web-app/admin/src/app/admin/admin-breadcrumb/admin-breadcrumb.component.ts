import { Component, Input } from '@angular/core';
import { AdminBreadcrumb } from './admin-breadcrumb.model';

@Component({
  selector: 'admin-breadcrumb',
  templateUrl: './admin-breadcrumb.component.html',
  styleUrls: ['./admin-breadcrumb.component.scss']
})
export class AdminBreadcrumbComponent {
  @Input() icon!: string;
  @Input() iconClass!: string;
  @Input() route!: string[];
  @Input() breadcrumbs!: AdminBreadcrumb[];
}
