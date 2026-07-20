import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { DeviceDashboardComponent } from './dashboard/devices-dashboard.component';
import { MatOptionModule as MatOptionModule } from '@angular/material/core';
import { AdminDeviceService } from '../services/admin-device.service';
import { CreateDeviceDialogComponent } from './create-device/create-device.component';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { DeviceDetailsComponent } from './device-details/device-details.component';
import { DeleteDeviceComponent } from './delete-device/delete-device.component';
import { LoginsModule } from '../admin-logins/admin-logins.module';
import { SearchBarComponent } from '../../search-bar/search-bar.component';

@NgModule({
    declarations: [
        DeviceDashboardComponent,
        DeviceDetailsComponent,
        DeleteDeviceComponent,
        CreateDeviceDialogComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        AdminBreadcrumbModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatDialogModule,
        MatFormFieldModule,
        MatDividerModule,
        MatIconModule,
        MatInputModule,
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatListModule,
        MatProgressSpinnerModule,
        AdminBreadcrumbModule,
        MatSelectModule,
        MatOptionModule,
        MatTooltipModule,
        MatTableModule,
        MatPaginatorModule,
        DragDropModule,
        AdminUsersModule,
        LoginsModule,
        SearchBarComponent
    ],
    exports: [
        DeviceDashboardComponent,
        DeviceDetailsComponent,
    ],
    providers: [
        AdminDeviceService
    ]
})
export class AdminDevicesModule { }