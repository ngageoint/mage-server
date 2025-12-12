import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserDetailsComponent } from './user-details/user-details.component';
import { DeleteUserComponent } from './delete-user/delete-user.component';
import { CoreModule } from '../../core/core.module';
import { LoginsModule } from '../../logins/logins.module';
import { UserDashboardComponent } from './dashboard/user-dashboard.component';
import { UserAvatarModule } from 'src/app/user/user-avatar/user-avatar.module';
import { CreateUserModalComponent } from './create-user/create-user.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatOptionModule } from '@angular/material/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BulkUserComponent } from './bulk-user/bulk-user.component';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';

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
    AdminBreadcrumbModule
  ],
  declarations: [
    UserDashboardComponent,
    UserDetailsComponent,
    DeleteUserComponent,
    CreateUserModalComponent,
    BulkUserComponent
  ],
  exports: [
    UserDetailsComponent,
    UserDashboardComponent,
    CreateUserModalComponent,
    BulkUserComponent
  ]
})
export class AdminUsersModule {}
