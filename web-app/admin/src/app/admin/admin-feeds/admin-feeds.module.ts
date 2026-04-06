import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatRippleModule } from '@angular/material/core';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatLegacySliderModule as MatSliderModule } from '@angular/material/legacy-slider';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MomentModule } from '../../../app/moment/moment.module';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { AdminFeedsComponent } from './admin-feeds.component';
import { AdminFeedComponent } from './admin-feed/admin-feed.component';
import { AdminFeedDeleteComponent } from './admin-feed/admin-feed-delete/admin-feed-delete.component';
import { AdminFeedEditComponent } from './admin-feed/admin-feed-edit/admin-feed-edit.component';
import { JsonSchemaWidgetAutocompleteComponent } from '../../../app/json-schema/json-schema-widget/json-schema-widget-autocomplete.component';
import { AdminServiceEditComponent } from './admin-service/admin-service-edit/admin-service-edit.component';
import { AdminFeedEditItemPropertiesComponent } from './admin-feed/admin-feed-edit/admin-feed-edit-item-properties/admin-feed-edit-item-properties.component';
import { AdminFeedEditTopicComponent } from './admin-feed/admin-feed-edit/admin-feed-edit-topic/admin-feed-edit-topic.component';
import { AdminFeedEditConfigurationComponent } from './admin-feed/admin-feed-edit/admin-feed-edit-configuration.component';
import { AdminServiceComponent } from './admin-service/admin-service.component';
import { AdminServiceDeleteComponent } from './admin-service/admin-service-delete/admin-service-delete.component';
import { AdminFeedEditTopicConfigurationComponent } from './admin-feed/admin-feed-edit/admin-feed-edit-topic/admin-feed-edit-topic-configuration.component';
import { JsonSchemaModule } from '../../json-schema/json-schema.module';
import { FeedItemSummaryModule } from '../../feed/feed-item/feed-item-summary/feed-item-summary.module';
import { StaticIconModule } from '@ngageoint/mage.web-core-lib/static-icon'
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    AdminFeedsComponent,
    AdminFeedComponent,
    AdminFeedDeleteComponent,
    AdminFeedEditComponent,
    JsonSchemaWidgetAutocompleteComponent,
    AdminServiceEditComponent,
    AdminFeedEditItemPropertiesComponent,
    AdminFeedEditTopicComponent,
    AdminFeedEditConfigurationComponent,
    AdminFeedEditTopicConfigurationComponent,
    AdminFeedEditTopicComponent,
    AdminServiceComponent,
    AdminServiceDeleteComponent
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    AdminBreadcrumbModule,
    MatAutocompleteModule,
    MatTabsModule,
    MatToolbarModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatRadioModule,
    MatCheckboxModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatSliderModule,
    MatExpansionModule,
    MatListModule,
    MatRippleModule,
    MatPaginatorModule,
    NgxMatSelectSearchModule,
    MatChipsModule,
    MatSidenavModule,
    MomentModule,
    FeedItemSummaryModule,
    JsonSchemaModule,
    StaticIconModule,
    RouterModule,
    MatSnackBarModule
  ],
  exports: [
    AdminFeedsComponent,
    AdminFeedComponent,
    AdminFeedEditComponent,
    AdminServiceEditComponent
  ]
})
export class AdminFeedsModule {}
