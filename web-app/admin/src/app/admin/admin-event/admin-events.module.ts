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
import { AdminEventFormModule } from './admin-event-form/admin-event-form.module';

import { EventDetailsComponent } from './event-details/event-details.component';
import { DeleteEventComponent } from './delete-event/delete-event.component';
import { CreateFormDialogComponent } from './create-form/create-form.component';
import { EventDashboardComponent } from './dashboard/event-dashboard.component';
import { MatOptionModule as MatOptionModule } from '@angular/material/core';
import { EventService } from 'src/app/event/event.service';
import { CreateEventDialogComponent } from './create-event/create-event.component';

@NgModule({
    declarations: [
        EventDashboardComponent,
        CreateEventDialogComponent,
        EventDetailsComponent,
        DeleteEventComponent,
        CreateFormDialogComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        CoreModule,
        ReactiveFormsModule,
        RouterModule,
        CoreModule,
        AdminBreadcrumbModule,
        AdminEventFormModule,
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
        DragDropModule
    ],
    exports: [
        EventDashboardComponent,
        EventDetailsComponent
    ],
    providers: [
        EventService
    ]
})
export class AdminEventsModule { }