import { Component, OnInit } from '@angular/core';
import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model'
import { MapSettingsService } from 'src/app/map/settings/map.settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MapSettings } from 'src/app/entities/map/entities.map';

@Component({
  selector: 'mage-admin-map',
  templateUrl: './admin-map.component.html',
  styleUrls: ['./admin-map.component.scss']
})
export class AdminMapComponent implements OnInit {

  readonly breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Map',
    icon: 'public'
  }]

  mobileSearchType: "NONE" | "NATIVE" | "NOMINATIM"
  mobileSearchOptions: string[] = ['NONE', 'NATIVE', 'NOMINATIM']

  webSearchType: "NONE" | "NOMINATIM"
  webSearchOptions: string[] = ['NONE', 'NOMINATIM']

  webNominatimUrl = ''
  mobileNominatimUrl = ''

  constructor(
    private mapSettingsService: MapSettingsService,
    private snackBar: MatSnackBar
  ) {
    this.mapSettingsService.getMapSettings().subscribe((settings: MapSettings) => {
      this.webSearchType = settings.webSearchType
      this.webNominatimUrl = settings.webNominatimUrl
      this.mobileSearchType = settings.mobileSearchType
      this.mobileNominatimUrl = settings.mobileNominatimUrl
    });
  }

  ngOnInit(): void {}

  save(): void {
    const settings: any = {
      webSearchType: this.webSearchType,
      mobileSearchType: this.mobileSearchType
    }

    if (this.webSearchType == "NOMINATIM") {
      settings.webNominatimUrl = this.webNominatimUrl
    }

    if (this.mobileSearchType == "NOMINATIM") {
      settings.mobileNominatimUrl = this.mobileNominatimUrl
    }

    this.mapSettingsService.updateMapSettings(settings).subscribe(() => {
      this.snackBar.open("Map settings saved", null, {
        duration: 2000,
      })
    }, (response) => {
      const message = response?.error?.message || "Error saving map settings"
      this.snackBar.open(message, null, {
        duration: 2000,
      })
    })
  }
}
