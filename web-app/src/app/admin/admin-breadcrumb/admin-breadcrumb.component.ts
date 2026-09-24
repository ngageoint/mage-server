import { Component, Input } from '@angular/core';
import { AdminBreadcrumb } from './admin-breadcrumb.model';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { NgClass, SlicePipe } from '@angular/common';

@Component({
    selector: 'admin-breadcrumb',
    templateUrl: './admin-breadcrumb.component.html',
    styleUrls: ['./admin-breadcrumb.component.scss'],
    standalone: true,
    imports: [
      MatIconModule,
      MatToolbarModule,
      RouterLink,
      NgClass,
      SlicePipe
    ]
})
export class AdminBreadcrumbComponent {
  @Input() icon!: string;
  @Input() iconClass!: string;
  @Input() route!: string[];
  @Input() breadcrumbs!: AdminBreadcrumb[];
}
