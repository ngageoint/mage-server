import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDashboardComponent } from './admin-dashboard';
import { SearchBarComponent } from '../../search-bar/search-bar.component';
import { LoginsModule } from '../admin-logins/admin-logins.module';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatListModule as MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule as MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatNativeDateModule } from '@angular/material/core';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { MatTableModule as MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [AdminDashboardComponent],
  imports: [
    CommonModule,
    SearchBarComponent,
    LoginsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatBadgeModule,
    MatSelectModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    AdminBreadcrumbModule,
    RouterModule
  ],
  exports: [AdminDashboardComponent],
})
export class AdminDashboardModule { }