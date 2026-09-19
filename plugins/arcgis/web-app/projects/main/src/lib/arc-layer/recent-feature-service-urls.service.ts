import { Injectable } from '@angular/core'

/**
 * Saving recently used feature service and portal urls in local storage to show previews
 * in the dropdown when adding feature services to ArcGIS
 */

const FEATURE_SERVICE_STORAGE_KEY = 'arcgis.recentFeatureServiceUrls'
const PORTAL_STORAGE_KEY = 'arcgis.recentPortalUrls'
const LIMIT = 10

@Injectable({
  providedIn: 'root'
})
export class RecentFeatureServiceUrlsService {
  getRecent(): string[] {
    return this.getStored(FEATURE_SERVICE_STORAGE_KEY)
  }

  addRecent(url: string): void {
    this.addStored(FEATURE_SERVICE_STORAGE_KEY, url)
  }

  getRecentPortalUrls(): string[] {
    return this.getStored(PORTAL_STORAGE_KEY)
  }

  addRecentPortalUrl(url: string): void {
    this.addStored(PORTAL_STORAGE_KEY, url)
  }

  private getStored(key: string): string[] {
    try {
      if (!('localStorage' in window) || window.localStorage === null) {
        return []
      }
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private addStored(key: string, url: string): void {
    try {
      if (!('localStorage' in window) || window.localStorage === null) {
        return
      }
      const recent = this.getStored(key).filter(existing => existing !== url)
      recent.unshift(url)
      localStorage.setItem(key, JSON.stringify(recent.slice(0, LIMIT)))
    } catch {
      // localStorage unavailable (private browsing, disabled storage, etc.)
    }
  }
}
