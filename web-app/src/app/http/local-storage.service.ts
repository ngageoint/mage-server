import { Injectable } from "@angular/core"

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  tokenKey = 'token'
  pollingIntervalKey = 'pollingInterval'
  timeIntervalKey = 'timeInterval'
  teamsKey = 'teams'
  mapPositionKey = 'mapPosition'
  coordinateSystemViewKey = 'coordinateSystemView'
  coordinateSystemEditKey = 'coordinateSystemEdit'
  timeZoneViewKey = 'timeZoneView'
  timeZoneEditKey = 'timeZoneEdit'
  timeFormatKey = 'timeFormat'

  getToken() {
    return this.getLocalItem(this.tokenKey)
  }

  setToken(token: any) {
    return this.setLocalItem(this.tokenKey, token)
  }

  removeToken() {
    return this.removeLocalItem(this.tokenKey)
  }

  setPollingInterval(pollingInterval) {
    return this.setLocalItem(this.pollingIntervalKey, pollingInterval)
  }

  getPollingInterval() {
    return this.getLocalItem(this.pollingIntervalKey)
  }

  setTimeInterval(timeInterval: any) {
    return this.setLocalItem(this.timeIntervalKey, JSON.stringify(timeInterval))
  }

  getTimeInterval() {
    const item = this.getLocalItem(this.timeIntervalKey)
    if (item) {
      const time = JSON.parse(item)

      if (time && time.options) {
        if (time.options.startDate) {
          time.options.startDate = new Date(time.options.startDate)
        }
        if (time.options.endDate) {
          time.options.endDate = new Date(time.options.endDate)
        }
      }
      
      return time
    } else return undefined
  }

  getTeams() {
    const item = this.getLocalItem(this.teamsKey)
    if (item) {
      return JSON.parse(item)
    } else return undefined
  }

  setTeams(teams: any) {
    return this.setLocalItem(this.teamsKey, JSON.stringify(teams))
  }

  removeTeams() {
    return this.removeLocalItem(this.teamsKey)
  }

  setMapPosition(mapPosition: any) {
    return this.setLocalItem(this.mapPositionKey, JSON.stringify(mapPosition))
  }

  getMapPosition() {
    const item = this.getLocalItem(this.mapPositionKey)
    if (item) {
      return JSON.parse(item)
    } else return undefined
  }

  getCoordinateSystemView() {
    return this.getLocalItem(this.coordinateSystemViewKey) || 'wgs84'
  }

  setCoordinateSystemView(coordinateSystem: any) {
    return this.setLocalItem(this.coordinateSystemViewKey, coordinateSystem)
  }

  getCoordinateSystemEdit() {
    return this.getLocalItem(this.coordinateSystemEditKey) || this.getCoordinateSystemView()
  }

  setCoordinateSystemEdit(coordinateSystem: any) {
    return this.setLocalItem(this.coordinateSystemEditKey, coordinateSystem)
  }

  getTimeZoneView() {
    return this.getLocalItem(this.timeZoneViewKey) || 'local'
  }

  setTimeZoneView(timeZone: any) {
    return this.setLocalItem(this.timeZoneViewKey, timeZone)
  }

  getTimeZoneEdit() {
    return this.getLocalItem(this.timeZoneEditKey) || this.getTimeZoneView()
  }

  setTimeZoneEdit(timeZone: any) {
    return this.setLocalItem(this.timeZoneEditKey, timeZone)
  }

  getTimeFormat() {
    return this.getLocalItem(this.timeFormatKey) || 'absolute'
  }

  setTimeFormat(timeFormat: any) {
    return this.setLocalItem(this.timeFormatKey, timeFormat)
  }

  getLocalItem(key: any) {
    try {
      if ('localStorage' in window && window['localStorage'] !== null) {
        return localStorage.getItem(key)
      }
    } catch (e) {
      return false
    }
  }

  setLocalItem(key: any, value: any) {
    try {
      if ('localStorage' in window && window.localStorage !== null) {
        return localStorage.setItem(key, value)
      }
    } catch (e) {
      return false
    }
  }

  removeLocalItem(key: any) {
    try {
      if ('localStorage' in window && window.localStorage !== null) {
        return localStorage.removeItem(key)
      }
    } catch (e) {
      return false
    }
  }

}
