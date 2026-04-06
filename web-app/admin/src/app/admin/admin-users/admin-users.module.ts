import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';

import { UserDetailsComponent } from './user-details/user-details.component';
import { DeleteUserComponent } from './delete-user/delete-user.component';
import { CoreModule } from '../../core/core.module';
import { LoginsModule } from '../../logins/logins.module';
import { UserDashboardComponent } from './dashboard/user-dashboard.component';
import { UserAvatarModule } from 'src/app/user/user-avatar/user-avatar.module';
import { CreateUserModalComponent } from './create-user/create-user.component';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyOptionModule as MatOptionModule } from '@angular/material/legacy-core';
import { ReactiveFormsModule } from '@angular/forms';
import { BulkUserComponent } from './bulk-user/bulk-user.component';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { UserSearchBoxComponent } from './user-search/user-search-box.component';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CoreModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    LoginsModule,
    UserAvatarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatOptionModule,
    AdminBreadcrumbModule,
    RouterModule,
  ],
  declarations: [
    UserDashboardComponent,
    UserDetailsComponent,
    DeleteUserComponent,
    CreateUserModalComponent,
    BulkUserComponent,
    UserSearchBoxComponent
  ],
  exports: [
    UserDetailsComponent,
    UserDashboardComponent,
    CreateUserModalComponent,
    BulkUserComponent,
    UserSearchBoxComponent
  ]
})
export class AdminUsersModule {}
