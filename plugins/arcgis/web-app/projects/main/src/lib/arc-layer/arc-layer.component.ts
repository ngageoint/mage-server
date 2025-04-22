import { Component, EventEmitter, Input, Output } from '@angular/core'
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../ArcGISPluginConfig'
import { ArcService } from '../arc.service'
import { FeatureLayerConfig, FeatureServiceConfig } from '../ArcGISConfig'
import { MatDialog } from '@angular/material/dialog'
import { ArcLayerSelectable } from './ArcLayerSelectable'
import { ArcLayerDialogComponent, DialogData } from './arc-layer-dialog.component'
import { ArcLayerDeleteDialogComponent } from './arc-layer-delete-dialog.component'

@Component({
  selector: 'arc-layer',
  templateUrl: './arc-layer.component.html',
  styleUrls: ['./arc-layer.component.scss']
})
export class ArcLayerComponent {

  @Input('config') config: ArcGISPluginConfig
  @Output() configChanged = new EventEmitter<ArcGISPluginConfig>()

  layers: ArcLayerSelectable[]
  events: string[] = []

  constructor(private arcService: ArcService, private dialog: MatDialog) {
    this.config = defaultArcGISPluginConfig
    this.layers = new Array<ArcLayerSelectable>()

    arcService.fetchEvents().subscribe(events => {
      this.events = events.map(event => event.name)
    })
  }

  onAddService() {
    this.dialog.open<ArcLayerDialogComponent, DialogData, FeatureServiceConfig>(ArcLayerDialogComponent, {
      data: { featureService: undefined },
      autoFocus: false,
      disableClose: true
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
      disableClose: true
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
  }
}