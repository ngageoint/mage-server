import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDialogModule,
  MatExpansionModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatPaginatorModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSliderModule,
  MatSnackBarModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule
} from '@angular/material';
import { UpgradeModule } from '@angular/upgrade/static';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MomentModule } from 'src/app/moment/moment.module';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { AdminSettingsComponent } from './admin-settings.component';


@NgModule({
  declarations: [
    AdminSettingsComponent
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
    MomentModule
  ],
  entryComponents: [
    AdminSettingsComponent
  ],
  exports: [
    AdminSettingsComponent
  ]
})
export class AdminSettingsModule {
}