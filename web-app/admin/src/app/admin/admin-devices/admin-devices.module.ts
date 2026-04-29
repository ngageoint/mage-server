import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatChipsModule as MatChipsModule } from '@angular/material/chips';
import { MatTableModule as MatTableModule } from '@angular/material/table';
import { MatPaginatorModule as MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { MatTooltipModule as MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatCheckboxModule as MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CoreModule } from '../../core/core.module';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { DeviceDashboardComponent } from './dashboard/devices-dashboard.component';
import { MatOptionModule as MatOptionModule } from '@angular/material/core';
import { AdminDeviceService } from '../services/admin-device.service';
import { CreateDeviceDialogComponent } from './create-device/create-device.component';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { DeviceDetailsComponent } from './device-details/device-details.component';
import { DeleteDeviceComponent } from './delete-device/delete-device.component';
import { LoginsModule } from '../../logins/logins.module';

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
        CoreModule,
        ReactiveFormsModule,
        RouterModule,
        CoreModule,
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
        MatProgressSpinnerModule,
        AdminBreadcrumbModule,
        MatSelectModule,
        MatOptionModule,
        MatTooltipModule,
        MatTableModule,
        MatPaginatorModule,
        DragDropModule,
        AdminUsersModule,
        LoginsModule
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