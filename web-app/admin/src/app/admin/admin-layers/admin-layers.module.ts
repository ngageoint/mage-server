import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
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
