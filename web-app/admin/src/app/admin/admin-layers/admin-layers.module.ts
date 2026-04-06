import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { CoreModule } from '../../core/core.module';
import { LayerDashboardComponent } from './dashboard/layer-dashboard.component';
import { CreateLayerDialogComponent } from './create-layer/create-layer.component';
import { LayersService } from './layers.service';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { LayerDetailsComponent } from './layer-details/layer-details.component';
import { DeleteLayerComponent } from './delete-layer/delete-layer.component';
import { LayerPreviewComponent } from './layer-preview/layer-preview.component';
import { ImageryLayerSettingsComponent } from './imagery-layer-settings/imagery-layer-settings.component';
import { RouterModule } from '@angular/router';

@NgModule({
    declarations: [
        LayerDashboardComponent,
        CreateLayerDialogComponent,
        LayerDetailsComponent,
        DeleteLayerComponent,
        LayerPreviewComponent,
        ImageryLayerSettingsComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatPaginatorModule,
        MatTableModule,
        MatIconModule,
        MatSelectModule,
        MatFormFieldModule,
        MatTooltipModule,
        MatCardModule,
        MatDividerModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatInputModule,
        CoreModule,
        AdminBreadcrumbModule,
        RouterModule
    ],
    providers: [
        LayersService
    ],
    exports: [
        LayerDashboardComponent
    ]
})
export class AdminLayersModule { }
