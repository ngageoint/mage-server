import { Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms'
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../ArcGISPluginConfig'
import { ArcService } from '../arc.service'
import { AuthType, OAuthAuthConfig, TokenAuthConfig, UsernamePasswordAuthConfig, FeatureServiceConfig } from '../ArcGISConfig';
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
    console.log('Editing layer ' + arcService.url)
    if (arcService.auth?.type === AuthType.Token && arcService.auth?.token) {
      this.currentUrl = this.addToken(arcService.url, arcService.auth.token);
    } else if (arcService.auth?.type === AuthType.UsernamePassword && arcService.auth?.username && arcService.auth?.password) {
      this.currentUrl = this.addCredentials(arcService.url, arcService.auth?.username, arcService.auth?.password);
    } else if (arcService.auth?.type === AuthType.OAuth && arcService.auth?.clientId) {
      // TODO: what needs to be sent in url for this to work?
      this.currentUrl = this.addOAuth(arcService.url, arcService.auth?.clientId);
    } else {
      throw new Error('Invalid layer config, auth credentials: ' + JSON.stringify(arcService))
    }
    
    this.arcLayerControl.setValue(arcService.url)
    // Safely set the token control value based on the type
    if (arcService.auth?.type === AuthType.Token) {
      this.arcTokenControl.setValue(arcService.auth.token);
    } else {
      this.arcTokenControl.setValue('');
    }
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

  onSignIn() {
    this.arcService.authenticate().subscribe({
      next(x) {
        console.log('got value ' + JSON.stringify(x));
      },
      error(err) {
        console.error('something wrong occurred: ' + err);
      },
      complete() {
        console.log('done');
      },
    });
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

  /**
   * Adds or edits a layer configuration based on the provided parameters.
   * 
   * @param params - The parameters for adding or editing a layer.
   * @param params.layerUrl - The URL of the layer to add or edit.
   * @param params.selectableLayers - An array of selectable layers.
   * @param params.authType - The type of authentication to use.
   * @param params.layerToken - Optional. The token for token-based authentication.
   * @param params.username - Optional. The username for username/password authentication.
   * @param params.password - Optional. The password for username/password authentication.
   * @param params.clientId - Optional. The client ID for OAuth authentication.
   * @param params.clientSecret - Optional. The client secret for OAuth authentication.
   * 
   * @throws Will throw an error if the provided authentication type is invalid.
   */
  onAddLayerUrl(params: {
    layerUrl: string,
    selectableLayers: ArcLayerSelectable[],
    authType: AuthType,
    layerToken?: string,
    username?: string,
    password?: string,
    clientId?: string,
    clientSecret?: string
  }): void {
    let serviceConfigToEdit = null;
    const { layerUrl, selectableLayers, authType, layerToken, username, password, clientId, clientSecret } = params;

    // Search if the layer in config to edit
    for (const service of this.config.featureServices) {
      if (service.url == layerUrl) {
        serviceConfigToEdit = service;
      }
    }

    // Add layer if it doesn't exist
    if (serviceConfigToEdit == null) {
      console.log('Adding layer ' + layerUrl);

      const authConfigMap = {
        [AuthType.Token]: { type: AuthType.Token, token: layerToken } as TokenAuthConfig,
        [AuthType.UsernamePassword]: { type: AuthType.UsernamePassword, username, password } as UsernamePasswordAuthConfig,
        [AuthType.OAuth]: { type: AuthType.OAuth, clientId, clientSecret } as OAuthAuthConfig
      };

      const authConfig = authConfigMap[authType];
      if (!authConfig) {
        throw new Error('Invalid authorization type: ' + authType);
      }

      // Creates a new feature layer configuration.
      const featureLayer: FeatureServiceConfig = {
        url: layerUrl,
        auth: authConfig,
        layers: []
      } as FeatureServiceConfig;

      // Adds selected layers to the feature layer configuration.
      if (selectableLayers) {
        for (const aLayer of selectableLayers) {
          if (aLayer.isSelected) {
            const layerConfig = {
              layer: aLayer.name,
              events: JSON.parse(JSON.stringify(this.events))
            }
            featureLayer.layers.push(layerConfig);
          }
        }

        // Add the new featureLayer to the config and emits the change.
        this.config.featureServices.push(featureLayer);
        this.configChanged.emit(this.config);
        // Persists the updated configuration using `arcService`.
        this.arcService.putArcConfig(this.config);
      }

    } else { // Edit existing layer
      console.log('Saving edited layer ' + layerUrl)
      const editedLayers = [];
      if (selectableLayers) {
        for (const aLayer of selectableLayers) {
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
    // Emit and persist the updated configuration.
    this.configChanged.emit(this.config);
    this.arcService.putArcConfig(this.config);
  }
  // Provide html access to auth types
  public AuthType = AuthType;

  // Helper method to add token to the URL
  // append to layerURL query parameter, outer url already contains ? separator
  addToken(url: string, token?: string) {
    let newUrl = url
    if (token != null && token.length > 0) {
      newUrl += '&' + 'token=' + encodeURIComponent(token)
    }
    return newUrl
  }

  // Helper method to add credentials to the URL
  // append to layerURL query parameter, outer url already contains ? separator
  private addCredentials(layerUrl: string, username: string, password: string): string {
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    return `${layerUrl}&username=${encodedUsername}&password=${encodedPassword}`;
  }

  // Helper method to add OAuth credentials to the URL
  // append to layerURL query parameter, outer url already contains ? separator
  private addOAuth(layerUrl: string, clientId: string): string {
    const encodedClientId = encodeURIComponent(clientId);
    return `${layerUrl}&client_id=${encodedClientId}`;
  }
}