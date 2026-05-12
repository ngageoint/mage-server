import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CoordinateSystemComponent } from './coordinate-system/coordinate-system.component';
import { PollingIntervalComponent } from './polling-interval/polling-interval.component';
import { TimeFormatComponent } from './time-format/time-format.component';
import { TimeZoneComponent } from './time-zone/time-zone.component';

@Component({
  selector: 'preferences',
  standalone: true,
  imports: [
    CommonModule,
    PollingIntervalComponent,
    TimeFormatComponent,
    TimeZoneComponent,
    CoordinateSystemComponent
  ],
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent  {}