import { Component, Input } from '@angular/core';
import { AdminBreadcrumb } from './admin-breadcrumb.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'admin-breadcrumb',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './admin-breadcrumb.component.html',
  styleUrls: ['./admin-breadcrumb.component.scss']
})
export class AdminBreadcrumbComponent {
  @Input() icon!: string;
  @Input() iconClass!: string;
  @Input() route!: string[];
  @Input() breadcrumbs!: AdminBreadcrumb[];
}
