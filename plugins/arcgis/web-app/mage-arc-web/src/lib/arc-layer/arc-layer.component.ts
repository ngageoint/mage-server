import { Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms'
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../ArcGISPluginConfig'
import { ArcService } from '../arc.service'
import { FeatureLayerConfig, FeatureServiceConfig } from '../ArcGISConfig';
import { MatDialog } from '@angular/material/dialog'
import { ArcLayerSelectable } from './ArcLayerSelectable';
import { EventResult } from '../EventsResult';

@Component({
  selector: 'arc-layer',
  templateUrl: './arc-layer.component.html',
  styleUrls: ['./arc-layer.component.scss']
})
export class ArcLayerComponent implements OnInit {

  @Input('config') config: ArcGISPluginConfig;
  @Output() configChanged = new EventEmitter<ArcGISPluginConfig>();

  layers: ArcLayerSelectable[];
  events: string[] = [];
  arcLayerControl = new FormControl('', [Validators.required])
  arcTokenControl = new FormControl('')
  isLoading: boolean;
  currentUrl?: string;
  private timeoutId: number;

  @ViewChild('addLayerDialog', { static: true })
  private addLayerTemplate: TemplateRef<unknown>
  @ViewChild('deleteLayerDialog', { static: true })
  private deleteLayerTemplate: TemplateRef<unknown>

  constructor(private arcService: ArcService, private dialog: MatDialog) {
    this.config = defaultArcGISPluginConfig;
    this.layers = new Array<ArcLayerSelectable>();
    this.isLoading = false;
    arcService.fetchEvents().subscribe(x => this.handleEventResults(x));
  }

  ngOnInit(): void {

  }

  handleEventResults(x: EventResult[]) {
    const events = []
    for (const event of x) {
      events.push(event.name)
    }
    this.events = events
  }

  onEditLayer(arcService: FeatureServiceConfig) {
    console.log('Editing layer ' + arcService.url + ', token: ' + arcService.token)
    this.arcLayerControl.setValue(arcService.url)
    this.arcTokenControl.setValue(arcService.token != null ? arcService.token : '')
    this.currentUrl = this.addToken(arcService.url, arcService.token)
    this.layers = []
    let selectedLayers = new Array<string>()
    for (const layer of arcService.layers) {
      selectedLayers.push(String(layer.layer))
    }
    this.fetchLayers(this.currentUrl, selectedLayers)
    this.dialog.open<unknown, unknown, string>(this.addLayerTemplate)
  }

  selectedChanged(arcLayer: ArcLayerSelectable) {
    arcLayer.isSelected = !arcLayer.isSelected
  }

  isSaveDisabled(): boolean {
    return this.layers.length == 0;
  }

  inputChanged(layerUrl: string, token?: string) {
    const url = this.addToken(layerUrl, token);
    console.log('Input changed ' + url);
    if (this.timeoutId !== undefined) {
      window.clearTimeout(this.timeoutId);
    }
    this.timeoutId = window.setTimeout(() => this.fetchLayers(url), 1000);
  }

  fetchLayers(url: string, selectedLayers?: string[]) {
    console.log('Fetching layers for ' + url);
    this.isLoading = true;
    this.layers = []
    this.arcService.fetchArcLayers(url).subscribe(x => {
      console.log('arclayer response ' + x);
      if (x.layers !== undefined) {
        for (const layer of x.layers) {
          const selectableLayer = new ArcLayerSelectable(layer.name);
          if (selectedLayers != null) {
            if (selectedLayers.length > 0) {
              selectableLayer.isSelected = selectedLayers.indexOf(layer.name) >= 0;
            } else {
              selectableLayer.isSelected = false
            }
          }
          this.layers.push(selectableLayer);
        }
      }
      this.isLoading = false;
    })
  }

  onAddLayer() {
    this.currentUrl = undefined
    this.arcLayerControl.setValue('')
    this.arcTokenControl.setValue('')
    this.layers = []
    this.dialog.open<unknown, unknown, string>(this.addLayerTemplate)
  }

  showDeleteLayer(layerUrl: string) {
    this.currentUrl = layerUrl
    this.dialog.open<unknown, unknown, string>(this.deleteLayerTemplate)
  }

  onDeleteLayer() {
    let index = 0;
    for (const featureServiceConfig of this.config.featureServices) {
      if (featureServiceConfig.url == this.currentUrl) {
        break;
      }
      index++;
    }
    if (index < this.config.featureServices.length) {
      this.config.featureServices.splice(index, 1);
    }
    this.configChanged.emit(this.config);
    this.arcService.putArcConfig(this.config);
  }

  onAddLayerUrl(layerUrl: string, layers: ArcLayerSelectable[]) {
    let serviceConfigToEdit = null;
    for (const service of this.config.featureServices) {
      if (service.url == layerUrl) {
        serviceConfigToEdit = service;
      }
    }

    if (serviceConfigToEdit == null) {
      console.log('Adding layer ' + layerUrl)
      const splitUrl = layerUrl.split('?');
      const justUrl = splitUrl[0];
      const params = splitUrl[1];
      const urlParams = new URLSearchParams(params);
      const token = urlParams.get('token');
      console.log('token is ' + token);
      const featureLayer = {
        url: justUrl,
        token: token,
        layers: []
      } as FeatureServiceConfig;
      for (const aLayer of layers) {
        if (aLayer.isSelected) {
          const layerConfig = {
            layer: aLayer.name,
            events: JSON.parse(JSON.stringify(this.events))
          }
          featureLayer.layers.push(layerConfig);
        }
      }
      this.config.featureServices.push(featureLayer);
    } else {
      console.log('Saving edited layer ' + layerUrl)
      const editedLayers = [];
      for (const aLayer of layers) {
        if (aLayer.isSelected) {
          let layerConfig = null
          if (serviceConfigToEdit.layers != null) {
            const index = serviceConfigToEdit.layers.findIndex((element) => {
              return element.layer === aLayer.name;
            })
            if (index != -1) {
              layerConfig = serviceConfigToEdit.layers[index]
            }
          }
          if (layerConfig == null) {
            layerConfig = {
              layer: aLayer.name,
              events: JSON.parse(JSON.stringify(this.events))
            }
          }
          editedLayers.push(layerConfig);
        }
      }
      serviceConfigToEdit.layers = editedLayers
    }

    this.configChanged.emit(this.config);
    this.arcService.putArcConfig(this.config);
  }

  addToken(url: string, token?: string) {
    let newUrl = url
    if (token != null && token.length > 0) {
      const index = url.indexOf('?')
      let separator = ''
      if (index == -1) {
        separator = '?'
      } else if (index < url.length - 1) {
        separator = '&'
      }
      newUrl += separator + 'token=' + token
    }
    return newUrl
  }

}