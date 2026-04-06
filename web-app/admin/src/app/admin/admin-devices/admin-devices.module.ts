import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';

import { CoreModule } from '../../core/core.module';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { DeviceDashboardComponent } from './dashboard/devices-dashboard.component';
import { MatLegacyOptionModule as MatOptionModule } from '@angular/material/legacy-core';
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