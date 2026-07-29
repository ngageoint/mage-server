import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule as MatTableModule } from '@angular/material/table';
import { MatPaginatorModule as MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserDetailsComponent } from './user-details/user-details.component';
import { UserDetailsViewComponent } from './user-details/user-details-view/user-details-view.component';
import { UserDetailsEditComponent } from './user-details/user-details-edit/user-details-edit.component';
import { DeleteUserComponent } from './delete-user/delete-user.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { LoginsModule } from '../admin-logins/admin-logins.module';
import { UserDashboardComponent } from './dashboard/user-dashboard.component';
import { UserAvatarModule } from 'src/app/user/user-avatar/user-avatar.module';
import { CreateUserModalComponent } from './create-user/create-user.component';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule as MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
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
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    LoginsModule,
    UserAvatarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatOptionModule,
    AdminBreadcrumbModule,
    RouterModule,
  ],
  declarations: [
    UserDashboardComponent,
    UserDetailsComponent,
    UserDetailsViewComponent,
    UserDetailsEditComponent,
    DeleteUserComponent,
    ChangePasswordComponent,
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
