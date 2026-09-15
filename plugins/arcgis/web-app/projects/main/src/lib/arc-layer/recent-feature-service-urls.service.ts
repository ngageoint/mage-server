import { Injectable } from '@angular/core'

/**
 * Saving recently used feature service urls in local storage to show previews 
 * in the dropdown when adding feature services to ArcGIS
 */

const STORAGE_KEY = 'arcgis.recentFeatureServiceUrls'
const LIMIT = 10

@Injectable({
  providedIn: 'root'
})
export class RecentFeatureServiceUrlsService {
  getRecent(): string[] {
    try {
      if (!('localStorage' in window) || window.localStorage === null) {
        return []
      }
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  addRecent(url: string): void {
    try {
      if (!('localStorage' in window) || window.localStorage === null) {
        return
      }
      const recent = this.getRecent().filter(existing => existing !== url)
      recent.unshift(url)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, LIMIT)))
    } catch {
      // localStorage unavailable (private browsing, disabled storage, etc.)
    }
  }
}
