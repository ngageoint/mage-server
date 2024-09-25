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
    if (arcService.token) {
      this.currentUrl = this.addToken(arcService.url, arcService.token);
    } else if (arcService.auth?.username && arcService.auth?.password) {
      this.currentUrl = this.addCredentials(arcService.url, arcService.auth?.username, arcService.auth?.password);
    } else {
      throw new Error('Invalid layer config, auth credentials: ' + JSON.stringify(arcService))
    }
    
    this.arcLayerControl.setValue(arcService.url)
    this.arcTokenControl.setValue(arcService.token != null ? arcService.token : '')
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

  inputChanged(layerUrl: string, token?: string, username?: string, password?: string) {
    let url: string;
     //TODO - switch to username/pw being in body and avoid in url query
     //TODO - remove hardcoded username/pw and update UI to provide
    username = 'username_example'
    password = 'password_example'
    
    if (token) {
      url = this.addToken(layerUrl, token);
    } else if (username && password) {
      url = this.addCredentials(layerUrl, username, password);
    } else {
      url = layerUrl;
    }
    //TODO - avoid logging plain text password
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


  // Define the overloads
  onAddLayerUrl(layerUrl: string, layerToken: string, layers: ArcLayerSelectable[]): void;
  onAddLayerUrl(layerUrl: string, username: string, password: string, layers: ArcLayerSelectable[]): void;

  // Implement the function
  /**
   * Adds a new layer to the configuration if it does not already exist.
   * 
   * @param layerUrl - The URL of the layer to be added.
   * @param arg2 - Either the username for authentication or the token for the layer.
   * @param arg3 - Either the password for authentication or an array of selectable layers.
   * @param arg4 - Optional array of selectable layers if `arg3` is a string (username).
   * 
   * This method performs the following steps:
   * 1. Checks if the layer already exists in the configuration.
   * 2. If the layer does not exist, it logs the addition of the layer.
   * 3. Authenticates and retrieves a token if `arg3` is a string (password).
   * 4. Creates a new feature layer configuration.
   * 5. Adds selected layers to the feature layer configuration.
   * 6. Updates the configuration and emits the change.
   * 7. Persists the updated configuration using `arcService`.
   */
  onAddLayerUrl(layerUrl: string, arg2: string, arg3: string | ArcLayerSelectable[], arg4?: ArcLayerSelectable[]): void {
    let serviceConfigToEdit = null;

    // Search if the layer in config to edit
    for (const service of this.config.featureServices) {
      if (service.url == layerUrl) {
        serviceConfigToEdit = service;
      }
    }
    // Determine if layers in 3rd or 4th argument
    const layers = typeof arg3 === 'string' ? arg4 : arg3;

    // Add layer if it doesn't exist
    if (serviceConfigToEdit == null) {
      console.log('Adding layer ' + layerUrl);
      let token: string | null = null;

      const featureLayer: FeatureServiceConfig = {
        url: layerUrl,
        token: undefined,
        auth: {
          username: '',
          password: ''
        },
        layers: []
      } as FeatureServiceConfig;

      if (typeof arg3 === 'string') {
        // Handle username and password case
        featureLayer.auth = { username: arg2, password: arg3 };
      } else {
        // Handle token case
        featureLayer.token = arg2;
      }
      
      if (layers) {
        for (const aLayer of layers) {
          if (aLayer.isSelected) {
            const layerConfig = {
              layer: aLayer.name,
              events: JSON.parse(JSON.stringify(this.events))
            }
            featureLayer.layers.push(layerConfig);
          }
        }

        // Add the new featureLayer to the config
        this.config.featureServices.push(featureLayer);
        this.configChanged.emit(this.config);
        this.arcService.putArcConfig(this.config);
      }

    } else { // Edit existing layer
      console.log('Saving edited layer ' + layerUrl)
      const editedLayers = [];
      if (layers) {
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
      }
      serviceConfigToEdit.layers = editedLayers
    }

    this.configChanged.emit(this.config);
    this.arcService.putArcConfig(this.config);
  }

  addToken(url: string, token?: string) {
    let newUrl = url
    if (token != null && token.length > 0) {
      // TODO - appending to query param featureURL because there is an outer url using ? separater already
      // const separator = url.includes('?') ? '&' : '?';
      // newUrl += separator + 'token=' + token
      newUrl += '&' + 'token=' + token
    }
    return newUrl
  }

  // Helper method to add credentials to the URL
  private addCredentials(layerUrl: string, username: string, password: string): string {
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    // append to layerURL query parameter, outer url already contains ? separator
    return `${layerUrl}&username=${encodedUsername}&password=${encodedPassword}`;
  }
}