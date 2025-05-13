import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { filter, map, Observable } from "rxjs";

interface Setting {
  type: string
  settings: object
}

export interface Banners {
  header?: Banner,
  footer?: Banner
}

export interface Banner {
  text: string
  color: string
  backgroundColor: string
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  constructor(private httpClient: HttpClient) { }

  getBanner(): Observable<Banners> {
    return this.httpClient.get<Setting>('/api/settings/banner')
      .pipe(filter<Setting>(Boolean))
      .pipe(map((setting: Setting) => {
        const banner = setting.settings as any
        return {
          header: banner.showHeader ? {
            text: banner.headerText,
            color: banner.headerTextColor,
            backgroundColor: banner.headerBackgroundColor
          } : undefined,
          footer: banner.showFooter ? {
            text: banner.footerText,
            color: banner.footerTextColor,
            backgroundColor: banner.footerBackgroundColor
          } : undefined
        }
      }))
  }
}