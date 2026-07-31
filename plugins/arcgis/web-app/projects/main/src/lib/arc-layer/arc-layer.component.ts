import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core'
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../ArcGISPluginConfig'
import { ArcService } from '../arc.service'
import { FeatureLayerConfig, FeatureServiceConfig } from '../ArcGISConfig'
import { MatDialog } from '@angular/material/dialog'
import { ArcLayerSelectable } from './ArcLayerSelectable'
import { ArcLayerDialogComponent, DialogData } from './arc-layer-dialog.component'
import { ArcLayerDeleteDialogComponent } from './arc-layer-delete-dialog.component'

@Component({
  standalone: false,
  selector: 'arc-layer',
  templateUrl: './arc-layer.component.html',
  styleUrls: ['./arc-layer.component.scss']
})
export class ArcLayerComponent implements OnChanges {

  @Input('config') config: ArcGISPluginConfig
  @Output() configChanged = new EventEmitter<ArcGISPluginConfig>()

  layers: ArcLayerSelectable[]
  events: string[] = []

  // service capabilities are fetched lazily and cached by url, since they aren't part of the saved config
  private serviceCapabilities = new Map<string, string | undefined>()

  constructor(private arcService: ArcService, private dialog: MatDialog) {
    this.config = defaultArcGISPluginConfig
    this.layers = new Array<ArcLayerSelectable>()

    arcService.fetchEvents().subscribe(events => {
      this.events = events.map(event => event.name)
    })
  }

  ngOnChanges(): void {
    this.refreshCapabilities()
  }

  private refreshCapabilities(): void {
    for (const service of this.config.featureServices) {
      if (this.serviceCapabilities.has(service.url)) {
        continue
      }
      // mark as pending immediately so a slow response doesn't trigger duplicate requests
      this.serviceCapabilities.set(service.url, undefined)
      this.arcService.fetchFeatureServiceCapabilities(service.url).subscribe({
        next: (result) => this.serviceCapabilities.set(service.url, result.capabilities),
        error: (error) => console.log('arc-layer fetchFeatureServiceCapabilities error: ' + error)
      })
    }
  }

  // unlike a missing/pending cache entry, only flag services we can positively confirm are read-only
  isReadOnly(featureService: FeatureServiceConfig): boolean {
    const capabilities = this.serviceCapabilities.get(featureService.url)
    if (!capabilities) {
      return false
    }
    const capabilityList = capabilities.split(',').map(c => c.trim())
    return !capabilityList.includes('Create') && !capabilityList.includes('Editing')
  }

  onAddService() {
    this.dialog.open<ArcLayerDialogComponent, DialogData, FeatureServiceConfig>(ArcLayerDialogComponent, {
      data: { featureService: undefined },
      autoFocus: false,
      disableClose: true,
      width: '700px'
    }).afterClosed().subscribe(featureService => {
      if (featureService) {
        this.addFeatureService(featureService)
      }
    })
  }

  onOpenService(featureService: FeatureLayerConfig) {
    
  }

  onEditService(featureService: FeatureServiceConfig) {
    this.dialog.open<ArcLayerDialogComponent, DialogData, FeatureServiceConfig>(ArcLayerDialogComponent, {
      data: { featureService },
      autoFocus: false,
      disableClose: true,
      width: '700px'
    }).afterClosed().subscribe(featureService => {
      if (featureService) {
        this.addFeatureService(featureService)
      }
    })
  }

  onDeleteService(featureService: FeatureServiceConfig) {
    this.dialog.open<ArcLayerDeleteDialogComponent, string, boolean>(ArcLayerDeleteDialogComponent, {
      data: featureService.url
    }).afterClosed().subscribe(result => {
      if (result === true) {
        this.config.featureServices = this.config.featureServices.filter(service => {
          return service.url !== featureService.url
        })

        this.configChanged.emit(this.config)
        this.arcService.putArcConfig(this.config)
      }
    })
  }

  addFeatureService(featureServer: FeatureServiceConfig): void {
    const existingFeatureServer = this.config.featureServices.find((service) => {
      return service.url === featureServer.url
    })

    if (existingFeatureServer == null) {
      featureServer.layers = featureServer.layers.map((layer: FeatureLayerConfig) => {
        return {
          ...layer,
          events: JSON.parse(JSON.stringify(this.events))
        }
      })
      
      this.config.featureServices.push(featureServer)
    } else {
      existingFeatureServer.layers = featureServer.layers.map(layer => {
        const existing = existingFeatureServer.layers.some(edit => edit.layer === layer.layer)
        if (!existing) {
          layer.events = JSON.parse(JSON.stringify(this.events))
        }

        return layer
      })
    }

    this.configChanged.emit(this.config)
    this.arcService.putArcConfig(this.config)
    this.refreshCapabilities()
  }
}