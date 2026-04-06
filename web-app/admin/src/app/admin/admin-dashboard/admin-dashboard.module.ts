import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDashboardComponent } from './admin-dashboard';
import { LoginsModule } from '../../logins/logins.module';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatNativeDateModule } from '@angular/material/core';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [AdminDashboardComponent],
  imports: [
    CommonModule,
    FormsModule,
    LoginsModule,
    MatToolbarModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatBadgeModule,
    MatSelectModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatNativeDateModule,
    MatTableModule,
    AdminBreadcrumbModule,
    RouterModule
  ],
  exports: [AdminDashboardComponent],
})
export class AdminDashboardModule { }