import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule as MatTableModule } from '@angular/material/table';
import { MatPaginatorModule as MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserDetailsComponent } from './user-details/user-details.component';
import { DeleteUserComponent } from './delete-user/delete-user.component';
import { CoreModule } from '../../core/core.module';
import { LoginsModule } from '../../logins/logins.module';
import { UserDashboardComponent } from './dashboard/user-dashboard.component';
import { UserAvatarModule } from 'src/app/user/user-avatar/user-avatar.module';
import { CreateUserModalComponent } from './create-user/create-user.component';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { MatTooltipModule as MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { MatOptionModule as MatOptionModule } from '@angular/material/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BulkUserComponent } from './bulk-user/bulk-user.component';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { UserSearchBoxComponent } from './user-search/user-search-box.component';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    UserDashboardComponent,
    UserDetailsComponent,
    DeleteUserComponent,
    CreateUserModalComponent,
    BulkUserComponent,
    UserSearchBoxComponent,
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
    RouterModule
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
