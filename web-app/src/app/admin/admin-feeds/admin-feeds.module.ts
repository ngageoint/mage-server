import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UpgradeModule } from '@angular/upgrade/static';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MomentModule } from 'src/app/moment/moment.module';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { AdminFeedsComponent } from './admin-feeds.component';
import { AdminFeedComponent } from './admin-feed/admin-feed.component';
import { AdminFeedDeleteComponent } from './admin-feed/admin-feed-delete/admin-feed-delete.component';
import { AdminFeedEditComponent } from './admin-feed/admin-feed-edit/admin-feed-edit.component';
import { JsonSchemaWidgetAutocompleteComponent } from 'src/app/json-schema/json-schema-widget/json-schema-widget-autocomplete.component';
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
    UpgradeModule,
    AdminBreadcrumbModule,
    MatAutocompleteModule,
    MatTabsModule,
    MatSnackBarModule,
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
    StaticIconModule
  ],
  exports: [
    AdminFeedsComponent,
    AdminFeedComponent,
    AdminFeedEditComponent,
    AdminServiceEditComponent
  ]
})
export class AdminFeedsModule {}
