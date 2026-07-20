import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule as MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule as MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LayerDashboardComponent } from './dashboard/layer-dashboard.component';
import { CreateLayerDialogComponent } from './create-layer/create-layer.component';
import { LayersService } from './layers.service';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { LayerDetailsComponent } from './layer-details/layer-details.component';
import { DeleteLayerComponent } from './delete-layer/delete-layer.component';
import { LayerPreviewComponent } from './layer-preview/layer-preview.component';
import { ImageryLayerSettingsComponent } from './imagery-layer-settings/imagery-layer-settings.component';
import { RouterModule } from '@angular/router';
import { SearchBarComponent } from '../../search-bar/search-bar.component';

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
        MatIconModule,
        MatSelectModule,
        MatFormFieldModule,
        MatTooltipModule,
        MatCardModule,
        MatDividerModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatInputModule,
        MatChipsModule,
        MatListModule,
        MatSlideToggleModule,
        MatRadioModule,
        MatExpansionModule,
        MatCheckboxModule,
        AdminBreadcrumbModule,
        RouterModule,
        SearchBarComponent
    ],
    providers: [
        LayersService
    ],
    exports: [
        LayerDashboardComponent
    ]
})
export class AdminLayersModule { }
