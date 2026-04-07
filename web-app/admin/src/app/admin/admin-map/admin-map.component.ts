import { Component, OnInit } from '@angular/core';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';

import { AdminBreadcrumb } from '../admin-breadcrumb/admin-breadcrumb.model';
import { MapSettingsService } from '../../../app/map/settings/map.settings.service';
import { MapSettings } from '../../../app/entities/map/entities.map';

type MobileSearchType = 'NONE' | 'NATIVE' | 'NOMINATIM';
type WebSearchType = 'NONE' | 'NOMINATIM';

@Component({
  selector: 'mage-admin-map',
  templateUrl: './admin-map.component.html',
  styleUrls: ['./admin-map.component.scss']
})
export class AdminMapComponent implements OnInit {
  readonly breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Map',
      icon: 'public'
    }
  ];

  mobileSearchType: MobileSearchType | null = 'NONE';
  mobileSearchOptions: MobileSearchType[] = ['NONE', 'NATIVE', 'NOMINATIM'];

  webSearchType: WebSearchType | null = 'NONE';
  webSearchOptions: WebSearchType[] = ['NONE', 'NOMINATIM'];

  webNominatimUrl: string = '';
  mobileNominatimUrl: string = '';

  constructor(
    private mapSettingsService: MapSettingsService,
    private snackBar: MatSnackBar
  ) {
    this.mapSettingsService.getMapSettings().subscribe({
      next: (settings: MapSettings | null | undefined) => {
        const s: any = settings ?? {};

        const webType = (s.webSearchType ?? 'NONE') as WebSearchType;
        const mobileType = (s.mobileSearchType ?? 'NONE') as MobileSearchType;

        this.webSearchType = this.isWebSearchType(webType) ? webType : 'NONE';
        this.mobileSearchType = this.isMobileSearchType(mobileType)
          ? mobileType
          : 'NONE';

        this.webNominatimUrl = s.webNominatimUrl ?? '';
        this.mobileNominatimUrl = s.mobileNominatimUrl ?? '';
      },
      error: (err) => {
        this.webSearchType = 'NONE';
        this.mobileSearchType = 'NONE';
        this.webNominatimUrl = '';
        this.mobileNominatimUrl = '';

        const message = err?.error?.message || 'Error loading map settings';
        this.snackBar.open(message, undefined, { duration: 3000 });
      }
    });
  }

  ngOnInit(): void {}

  save(): void {
    const webType: WebSearchType = this.webSearchType ?? 'NONE';
    const mobileType: MobileSearchType = this.mobileSearchType ?? 'NONE';

    const payload: any = {
      webSearchType: webType,
      mobileSearchType: mobileType
    };

    if (webType === 'NOMINATIM') {
      payload.webNominatimUrl = this.webNominatimUrl;
    }

    if (mobileType === 'NOMINATIM') {
      payload.mobileNominatimUrl = this.mobileNominatimUrl;
    }

    this.mapSettingsService.updateMapSettings(payload).subscribe({
      next: () => {
        this.snackBar.open('Map settings saved', undefined, {
          duration: 2000
        });
      },
      error: (response) => {
        const message = response?.error?.message || 'Error saving map settings';
        this.snackBar.open(message, undefined, {
          duration: 2000
        });
      }
    });
  }

  private isMobileSearchType(value: any): value is MobileSearchType {
    return value === 'NONE' || value === 'NATIVE' || value === 'NOMINATIM';
  }

  private isWebSearchType(value: any): value is WebSearchType {
    return value === 'NONE' || value === 'NOMINATIM';
  }
}
