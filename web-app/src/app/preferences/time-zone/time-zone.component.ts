import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange as MatSelectChange, MatSelectModule } from '@angular/material/select';
import { LocalStorageService } from 'src/app/http/local-storage.service';

interface TimeZoneOption {
  title: string
  timezone: 'local' | 'gmt'
}

@Component({
  selector: 'time-zone',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './time-zone.component.html',
  styleUrls: ['./time-zone.component.scss']
})
export class TimeZoneComponent implements OnInit {

  timezoneOptions: TimeZoneOption[] = [{
    title: 'Local',
    timezone: 'local'
  }, {
    title: 'GMT',
    timezone: 'gmt'
  }]
  timezoneOption: TimeZoneOption

  constructor(
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    const timezone = this.localStorageService.getTimeZoneView()
    this.timezoneOption = this.timezoneOptions.find((option: TimeZoneOption) => option.timezone === timezone)
  }

  updateTimeZone(change: MatSelectChange) {
    this.localStorageService.setTimeZoneView(change.value.timezone);
  }

  public compareOption = function (option: TimeZoneOption, value: TimeZoneOption): boolean {
    return option.timezone === value.timezone
  }
}