import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { StateService } from '@uirouter/angular';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { LayersService, Layer } from '../layers.service';
import { EventsService } from '../../admin-event/events.service';
import { LocalStorageService, UserService } from '../../../upgrade/ajs-upgraded-providers';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { CardActionButton } from '../../../core/card-navbar/card-navbar.component';
import { SearchModalComponent, SearchModalData, SearchModalResult, SearchModalColumn } from '../../../core/search-modal/search-modal.component';
import { DeleteLayerComponent } from '../delete-layer/delete-layer.component';
import { Event } from 'src/app/filter/filter.types';
import { Observable } from 'rxjs';
import * as L from 'leaflet';

interface UrlLayer {
  table: string;
  url: string;
}

interface UploadStatus {
  name?: string;
  features?: number;
  error?: string;
}

interface UploadItem {
  file?: File;
  uploading?: boolean;
  error?: string;
  uploadStatus?: UploadStatus;
}

interface PagedResult<T> {
  items: T[];
  totalCount?: number;
  pageSize?: number;
  pageIndex?: number;
}

@Component({
  selector: 'mage-layer-details',
  templateUrl: './layer-details.component.html',
  styleUrls: ['./layer-details.component.scss']
})
export class LayerDetailsComponent implements OnInit {
  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Layers',
      icon: 'map',
      state: { name: 'admin.layers' }
    }
  ];

  layer: Layer;
  layerEvents: Event[] = [];
  nonLayerEvents: Event[] = [];
  urlLayers: UrlLayer[] = [];
  loading = true;
  error: string | null = null;

  loadingEvents = true;
  eventsPageIndex = 0;
  eventsPageSize = 5;
  eventsPage: PagedResult<Event> = { items: [], totalCount: 0 };
  eventSearchTerm = '';
  editEvents = false;
  eventsDataSource = new MatTableDataSource<Event>();
  eventsDisplayedColumns = ['content'];
  pageSizeOptions = [5, 10, 25];
  eventActionButtons: CardActionButton[] = [];

  uploads: UploadItem[] = [{}];
  uploadConfirmed = false;
  uploadStatuses: { [key: number]: UploadStatus } = {};
  completedUploads: UploadStatus[] = [];
  uploadMessage = '';
  fileUploadUrl = '';
  isUploading = false;

  hasLayerEditPermission = false;
  hasLayerDeletePermission = false;

  editingDetails = false;
  layerEditForm = {
    name: '',
    description: '',
    url: '',
    format: '',
    base: false,
    wmsVersion: '1.3.0',
    wmsTransparent: true,
    wmsStyles: ''
  };

  // WMS-related properties
  wmsCapabilities: any = null;
  wmsError: string = '';
  wmsLayers: any[] = [];
  wmsOtherLayers: any[] = [];
  selectedWmsLayers: { [key: string]: boolean } = {};
  advancedOptionsExpanded: boolean = false;
  isLoadingWms: boolean = false;
  showPreview: boolean = false;
  previewMap: L.Map | null = null;
  previewMapLayer: L.Layer | null = null;
  showWmsCapabilitiesDocument: boolean = false;
  wmsLayerSearchQuery: string = '';

  @ViewChild('previewMapContainer') previewMapContainer: ElementRef;

  constructor(
    private stateService: StateService,
    private layersService: LayersService,
    private eventsService: EventsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    @Inject(LocalStorageService) private localStorageService: any,
    @Inject(UserService) private userService: any
  ) { }

  ngOnInit(): void {
    const layerId = this.stateService.params.layerId;
    if (!layerId) {
      console.error('No layerId found in route params');
      return;
    }

    const permissions = this.userService.myself?.role?.permissions || [];
    this.hasLayerEditPermission = permissions.includes('UPDATE_LAYER');
    this.hasLayerDeletePermission = permissions.includes('DELETE_LAYER');

    this.fileUploadUrl = `/api/layers/${layerId}/kml?access_token=${this.localStorageService.getToken()}`;

    this.loadLayer(layerId);

    this.updateActionButtons();
  }

  private loadLayer(layerId: string): void {
    this.loading = true;
    this.layersService.getLayerById(layerId).subscribe({
      next: (layer) => {
        this.layer = layer;
        this.loading = false;
        this.breadcrumbs.push({
          title: layer.name || 'Layer Details'
        });

        if (this.layer.state !== 'available') {
          setTimeout(() => this.checkLayerProcessingStatus(), 1000);
        }

        this.updateUrlLayers();
        this.getEventsPage();
      },
      error: (error) => {
        console.error('Error loading layer:', error);
        this.loading = false;
        this.error = error.message || 'Failed to load layer';
        this.snackBar.open('Error loading layer: ' + this.error, 'Close', { duration: 5000 });
      }
    });
  }

  private updateUrlLayers(): void {
    const mapping: UrlLayer[] = [];
    if (this.layer.tables) {
      this.layer.tables.forEach(table => {
        mapping.push({
          table: table.name,
          url: `/api/layers/${this.layer.id}/${table.name}/{z}/{x}/{y}.png?access_token=${this.localStorageService.getToken()}`
        });
      });
    }
    this.urlLayers = mapping;
  }

  /**
   * Configures action buttons for events section.
   */
  private updateActionButtons(): void {
    this.eventActionButtons = [];

    if (this.hasLayerEditPermission) {
      this.eventActionButtons.push({
        label: this.editEvents ? 'Done' : 'Edit Events',
        action: () => this.toggleEditEvents(),
        type: this.editEvents ? 'btn-primary' : 'btn-secondary'
      });

      this.eventActionButtons.push({
        label: 'Add Event',
        action: () => this.addEventToLayer(),
        type: 'btn-secondary'
      });
    }
  }

  /**
   * Loads paginated events for the current layer using server-side pagination.
   */
  getEventsPage(): void {
    if (!this.layer?.id) {
      this.loadingEvents = false;
      return;
    }

    const searchOptions: any = {
      page: this.eventsPageIndex,
      page_size: this.eventsPageSize,
      layerId: String(this.layer.id)
    };

    if (this.eventSearchTerm) {
      searchOptions.term = this.eventSearchTerm;
    }

    this.eventsService.getEvents(searchOptions).subscribe({
      next: (response) => {
        const layerEvents = response.items || [];

        if (this.eventsPageIndex === 0) {
          this.layerEvents = layerEvents;
        }

        this.eventsPage = {
          items: layerEvents,
          totalCount: response.totalCount || layerEvents.length,
          pageSize: this.eventsPageSize,
          pageIndex: this.eventsPageIndex
        };
        this.eventsDataSource.data = layerEvents;
        this.loadingEvents = false;
      },
      error: (error) => {
        console.error('Error loading events:', error);
        this.loadingEvents = false;
        this.snackBar.open('Error loading events', 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Handles event search input changes.
   */
  onEventSearchChange(searchTerm?: string): void {
    this.eventSearchTerm = searchTerm || '';
    this.eventsPageIndex = 0;
    this.getEventsPage();
  }

  /**
   * Handles event pagination changes.
   */
  onEventsPageChange(event: PageEvent): void {
    this.eventsPageIndex = event.pageIndex;
    this.eventsPageSize = event.pageSize;
    this.getEventsPage();
  }

  /**
   * Toggles event edit mode and updates action buttons.
   */
  toggleEditEvents(): void {
    this.editEvents = !this.editEvents;
    this.updateActionButtons();
  }

  /**
   * Navigates to event details page.
   */
  gotoEvent(event: Event): void {
    this.stateService.go('admin.event', { eventId: event.id });
  }

  /**
   * Opens search dialog to add events to layer.
   */
  addEventToLayer(): void {
    if (!this.layer?.id) {
      return;
    }

    const dialogRef = this.dialog.open(SearchModalComponent, {
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Events to Layer',
        searchPlaceholder: 'Search for events to add...',
        type: 'events',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return new Observable(observer => {
            const searchOptions: any = {
              page: page,
              page_size: pageSize,
              excludeLayerId: String(this.layer.id)
            };

            if (searchTerm) {
              searchOptions.term = searchTerm;
            }

            this.eventsService.getEvents(searchOptions).subscribe({
              next: (response) => {
                let filteredEvents = response.items || [];
                if (!this.userService.myself?.role?.permissions?.includes('UPDATE_EVENT')) {
                  filteredEvents = filteredEvents.filter(event => {
                    const permissions = event.acl?.[this.userService.myself.id]?.permissions || [];
                    return permissions.includes('update');
                  });
                }

                observer.next({
                  items: filteredEvents,
                  totalCount: response.totalCount || filteredEvents.length,
                  pageSize: pageSize,
                  pageIndex: page
                });
                observer.complete();
              },
              error: (error) => observer.error(error)
            });
          });
        },
        columns: [
          {
            key: 'name',
            label: 'Event Name',
            displayFunction: (event: Event) => event.name || 'Unnamed Event',
            width: '50%'
          },
          {
            key: 'description',
            label: 'Description',
            displayFunction: (event: Event) => event.description || 'No description',
            width: '50%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result && result.selectedItem && this.layer?.id) {
        const selectedEvent = result.selectedItem;
        console.log('Adding layer to selected event:', selectedEvent);

        this.eventsService.addLayerToEvent(String(selectedEvent.id), { id: this.layer.id }).subscribe({
          next: () => {
            this.getEventsPage();
            this.snackBar.open(`Layer added to event: ${selectedEvent.name}`, null, { duration: 2000 });
          },
          error: (error) => {
            console.error('Error adding layer to event:', error);
            this.snackBar.open('Error adding layer to event', 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  /**
   * Removes layer from event.
   */
  removeEventFromLayer(event: Event, mouseEvent?: MouseEvent): void {
    if (mouseEvent) {
      mouseEvent.stopPropagation();
    }

    this.eventsService.removeLayerFromEvent(event.id.toString(), this.layer.id)
      .subscribe({
        next: () => {
          this.getEventsPage();
          this.snackBar.open('Layer removed from event', null, { duration: 2000 });
        },
        error: (error) => {
          console.error('Error removing layer from event:', error);
          this.snackBar.open('Error removing layer from event', 'Close', { duration: 5000 });
        }
      });
  }

  toggleEditDetails(): void {
    if (!this.editingDetails) {
      this.layerEditForm.name = this.layer?.name || '';
      this.layerEditForm.description = this.layer?.description || '';

      // Initialize imagery fields if editing an imagery layer
      if (this.layer?.type === 'Imagery') {
        this.layerEditForm.url = this.layer.url || '';
        this.layerEditForm.format = this.layer.format || 'XYZ';
        this.layerEditForm.base = !!this.layer.base;

        // Initialize WMS fields if WMS layer
        if (this.layer.format === 'WMS' && this.layer.wms) {
          this.layerEditForm.wmsVersion = this.layer.wms.version || '1.3.0';
          this.layerEditForm.wmsTransparent = this.layer.wms.transparent !== false;
          this.layerEditForm.wmsStyles = this.layer.wms.styles || '';

          // Pre-select layers
          if (this.layer.wms.layers) {
            const layers = this.layer.wms.layers.split(',');
            this.selectedWmsLayers = {};
            layers.forEach(layerName => {
              this.selectedWmsLayers[layerName.trim()] = true;
            });
          }

          // Auto-fetch capabilities if URL exists
          if (this.layer.url) {
            this.fetchWmsCapabilities();
          }
        }
      }
    } else {
      // Reset WMS data when canceling
      this.wmsCapabilities = null;
      this.wmsError = '';
      this.wmsLayers = [];
      this.wmsOtherLayers = [];
      this.selectedWmsLayers = {};
    }
    this.editingDetails = !this.editingDetails;
  }

  saveLayerDetails(): void {
    if (!this.layer?.id) {
      return;
    }

    const updatedLayer: any = {
      name: this.layerEditForm.name,
      description: this.layerEditForm.description,
      type: this.layer.type
    };

    // Add imagery-specific fields
    if (this.layer.type === 'Imagery') {
      updatedLayer.url = this.layerEditForm.url;
      updatedLayer.format = this.layerEditForm.format;
      updatedLayer.base = this.layerEditForm.base;

      // Add WMS-specific fields
      if (this.layerEditForm.format === 'WMS') {
        const selectedLayers = this.getSelectedWmsLayers();

        updatedLayer.wms = {
          layers: selectedLayers || '',
          version: this.layerEditForm.wmsVersion,
          transparent: this.layerEditForm.wmsTransparent,
          format: this.layerEditForm.wmsTransparent ? 'image/png' : 'image/jpeg',
          styles: this.layerEditForm.wmsStyles || ''
        };
      }
    }

    this.layersService.updateLayer(String(this.layer.id), updatedLayer)
      .subscribe({
        next: (updated) => {
          this.layer = { ...this.layer, ...updated };
          this.editingDetails = false;
          this.wmsCapabilities = null;
          this.wmsError = '';
          this.wmsLayers = [];
          this.wmsOtherLayers = [];
          this.selectedWmsLayers = {};
          this.snackBar.open('Layer updated successfully', null, { duration: 2000 });
        },
        error: (error) => {
          console.error('Error updating layer:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown error';
          this.snackBar.open('Error updating layer: ' + errorMessage, 'Close', { duration: 5000 });
        }
      });
  }

  cancelEditDetails(): void {
    this.editingDetails = false;
    this.layerEditForm.name = this.layer?.name || '';
    this.layerEditForm.description = this.layer?.description || '';
    this.wmsCapabilities = null;
    this.wmsError = '';
    this.wmsLayers = [];
    this.wmsOtherLayers = [];
    this.selectedWmsLayers = {};
    this.closePreview();
  }

  editLayer(): void {
    this.stateService.go('admin.layerEdit', { layerId: this.layer.id });
  }

  deleteLayer(): void {
    const dialogRef = this.dialog.open(DeleteLayerComponent, {
      data: { layer: this.layer }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Layer deleted successfully', 'Close', { duration: 3000 });
        this.stateService.go('admin.layers');
      }
    });
  }

  isLayerFileBased(): boolean {
    return this.layer && !!this.layer.file;
  }

  downloadLayer(): void {
    const accessToken = this.localStorageService.getToken();
    const downloadURL = `/api/layers/${this.layer.id}/file?access_token=${accessToken}`;

    const a = document.createElement('a');
    a.href = downloadURL;
    a.download = this.layer.file.name;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  addUploadFile(): void {
    this.uploads.push({});
  }

  onFileSelected(event: any, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const validExtensions = ['.kml', '.kmz', '.zip'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        this.uploads[index].error = `Invalid file type. Please upload a KML or KMZ file.`;
        this.snackBar.open(this.uploads[index].error, 'Close', { duration: 5000 });
        return;
      }

      // 50MB in bytes
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        this.uploads[index].error = `File size exceeds 50MB limit.`;
        this.snackBar.open(this.uploads[index].error, 'Close', { duration: 5000 });
        return;
      }

      this.uploads[index].file = file;
      this.uploads[index].error = undefined;
    }
  }

  confirmUpload(): void {
    const filesSelected = this.uploads.filter(u => u.file).length;

    if (filesSelected === 0) {
      this.snackBar.open('Please select at least one file to upload', 'Close', { duration: 3000 });
      return;
    }

    if (this.layer.type !== 'Feature') {
      this.snackBar.open(`Cannot upload to layer of type "${this.layer.type}". Only Feature (Static) layers support file uploads.`, 'Close', { duration: 5000 });
      return;
    }

    this.isUploading = true;
    let uploadCount = 0;
    let successCount = 0;
    let errorCount = 0;

    this.completedUploads = [];
    this.uploads.forEach((upload, index) => {
      if (upload.file) {
        uploadCount++;
        upload.uploading = true;
        upload.error = undefined;

        this.uploadFile(upload.file, index).subscribe({
          next: (response) => {
            upload.uploading = false;
            successCount++;

            const fileInfo = response.files && response.files[0];
            const featuresCreated = fileInfo ? fileInfo.features : 0;

            upload.uploadStatus = {
              name: upload.file.name,
              features: featuresCreated
            };

            this.uploadStatuses[index] = upload.uploadStatus;

            if (successCount + errorCount === uploadCount) {
              this.onAllUploadsComplete(successCount, errorCount);
            }
          },
          error: (error) => {
            upload.uploading = false;
            let errorMessage = 'Upload failed';

            if (typeof error.error === 'string' && error.error.trim()) {
              errorMessage = error.error;
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.message) {
              errorMessage = error.message;
            } else if (error.statusText) {
              errorMessage = error.statusText;
            }

            if (error.status && error.status !== 0) {
              errorMessage = `${error.status}: ${errorMessage}`;
            }

            upload.error = `${upload.file.name}: ${errorMessage}`;
            upload.uploadStatus = {
              name: upload.file.name,
              error: errorMessage
            };
            errorCount++;
            this.snackBar.open(`Failed to upload ${upload.file.name}: ${errorMessage}`, 'Close', { duration: 8000 });
            if (successCount + errorCount === uploadCount) {
              this.onAllUploadsComplete(successCount, errorCount);
            }
          }
        });
      }
    });
  }

  private uploadFile(file: File, index: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = `/api/layers/${this.layer.id}/kml`;
    return this.http.post<any>(uploadUrl, formData);
  }

  private onAllUploadsComplete(successCount: number, errorCount: number): void {
    this.isUploading = false;

    const successfulUploads = this.uploads
      .filter(upload => upload.uploadStatus)
      .map(upload => upload.uploadStatus);

    this.completedUploads = [...this.completedUploads, ...successfulUploads];

    if (successCount > 0 && errorCount === 0) {
      this.snackBar.open(`Successfully uploaded ${successCount} file(s)`, 'Close', { duration: 3000 });
      this.layer = { ...this.layer, _timestamp: Date.now() } as any;
    } else if (successCount > 0 && errorCount > 0) {
      this.snackBar.open(`Uploaded ${successCount} file(s), ${errorCount} failed`, 'Close', { duration: 5000 });
      this.layer = { ...this.layer, _timestamp: Date.now() } as any;
    }

    this.uploads = [{}];
  }

  removeUploadFile(index: number): void {
    if (this.uploads.length > 1) {
      this.uploads.splice(index, 1);
      delete this.uploadStatuses[index];
    } else {
      this.uploads[0] = {};
      delete this.uploadStatuses[0];
    }
  }

  confirmCreateLayer(): void {
    this.snackBar.open('Creating layer...', null, { duration: 2000 });
    setTimeout(() => this.checkLayerProcessingStatus(), 1500);
  }

  private checkLayerProcessingStatus(): void {
    this.layersService.getLayerById(this.stateService.params.layerId).subscribe(layer => {
      this.layer = layer;
      this.updateUrlLayers();

      if (this.layer.state !== 'available') {
        setTimeout(() => this.checkLayerProcessingStatus(), 5000);
      }
    });
  }

  /**
   * Handles format change when editing imagery layers
   */
  onFormatChange(): void {
    const format = this.layerEditForm.format;
    const url = this.layerEditForm.url;

    if (format === 'WMS' && url) {
      this.fetchWmsCapabilities();
    } else {
      this.wmsCapabilities = null;
      this.wmsError = '';
      this.wmsLayers = [];
      this.wmsOtherLayers = [];
      this.selectedWmsLayers = {};
    }
  }

  /**
   * Fetches WMS GetCapabilities document from the server
   */
  fetchWmsCapabilities(): void {
    const url = this.layerEditForm.url;
    if (!url) {
      this.wmsError = 'Please enter a WMS URL first';
      return;
    }

    this.isLoadingWms = true;
    this.wmsError = '';
    this.wmsCapabilities = null;
    this.wmsLayers = [];
    this.wmsOtherLayers = [];

    const baseUrl = url.split('?')[0];
    this.http.post<any>('/api/layers/wms/getcapabilities', { url: baseUrl }).subscribe({
      next: (response) => {
        this.isLoadingWms = false;
        if (response && response.Capability) {
          this.wmsCapabilities = response;
          this.parseWmsLayers(response.Capability.Layer, this.wmsLayers, this.wmsOtherLayers);
          this.layerEditForm.wmsVersion = response.version || '1.3.0';

          if (this.wmsLayers.length === 0 && this.wmsOtherLayers.length === 0) {
            this.wmsError = 'No layers found in WMS Capabilities document.';
          }
        } else {
          this.wmsError = 'Invalid response received from WMS Server, please check your URL and try again.';
        }
      },
      error: (error) => {
        this.isLoadingWms = false;
        let errorMessage = 'Failed to load WMS Capabilities document.';

        if (error.status === 0) {
          errorMessage = 'Network error: Unable to connect to the WMS server. Please check your connection and URL.';
        } else if (error.status === 404) {
          errorMessage = 'WMS server not found (404). Please verify the URL is correct.';
        } else if (error.status === 500) {
          errorMessage = 'WMS server error (500). The server may be experiencing issues.';
        } else if (error.status === 403) {
          errorMessage = 'Access forbidden (403). You may not have permission to access this WMS server.';
        } else if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }
        }

        this.wmsError = errorMessage;
      }
    });
  }

  /**
   * Parses WMS layers from capabilities document
   */
  private parseWmsLayers(layer: any, layers: any[], otherLayers: any[], layerHierarchy?: string): void {
    const all = Array.isArray(layer) ? layer : [layer];
    all.forEach(l => {
      if (l.Name) {
        l.Title = layerHierarchy ? `${layerHierarchy} - ${l.Title}` : l.Title;
        if (this.checkWmsLayer(l)) {
          layers.push(l);
        } else {
          otherLayers.push(l);
        }
      }

      if (l.Layer) {
        this.parseWmsLayers(l.Layer, layers, otherLayers, l.Title);
      }
    });
  }

  /**
   * Checks if layer supports EPSG:3857
   */
  private checkWmsLayer(layer: any): boolean {
    if (layer.CRS) {
      return layer.CRS.some((crs: string) =>
        crs.indexOf('EPSG:3857') !== -1 || crs.indexOf('EPSG:900913') !== -1
      );
    }
    return false;
  }

  /**
   * Handles WMS layer selection toggle
   */
  onWmsLayerToggle(layerName: string): void {
    // Toggle is handled by ngModel binding
  }

  /**
   * Toggles advanced options visibility
   */
  toggleAdvancedOptions(): void {
    this.advancedOptionsExpanded = !this.advancedOptionsExpanded;
  }

  /**
   * Toggles WMS capabilities document visibility
   */
  toggleWmsCapabilitiesDocument(): void {
    this.showWmsCapabilitiesDocument = !this.showWmsCapabilitiesDocument;
  }

  /**
   * Opens preview map
   */
  openPreview(): void {
    try {
      this.showPreview = true;
      setTimeout(() => {
        this.initializePreviewMap();
        this.updatePreviewMap();
      }, 100);
    } catch (error) {
      console.error('Error opening preview:', error);
      this.snackBar.open('Failed to open preview map. Please try again.', 'Close', { duration: 3000 });
      this.showPreview = false;
    }
  }

  /**
   * Closes preview map
   */
  closePreview(): void {
    this.showPreview = false;
    if (this.previewMap) {
      this.previewMap.remove();
      this.previewMap = null;
      this.previewMapLayer = null;
    }
  }

  /**
   * Initializes the Leaflet preview map
   */
  private initializePreviewMap(): void {
    if (!this.previewMapContainer || this.previewMap) return;

    this.previewMap = L.map(this.previewMapContainer.nativeElement, {
      center: [0, 0],
      zoom: 3,
      minZoom: 0,
      maxZoom: 18,
      zoomControl: true,
      trackResize: true,
      scrollWheelZoom: true,
      attributionControl: true,
      worldCopyJump: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(this.previewMap);
  }

  /**
   * Updates the preview map with the current layer configuration
   */
  private updatePreviewMap(): void {
    if (!this.previewMap) return;

    try {
      if (this.previewMapLayer) {
        this.previewMap.removeLayer(this.previewMapLayer);
        this.previewMapLayer = null;
      }

      const url = this.layerEditForm.url;
      const format = this.layerEditForm.format;

      if (!url || !format) return;

      if (format === 'XYZ' || format === 'TMS') {
        this.previewMapLayer = L.tileLayer(url, {
          tms: format === 'TMS',
          maxZoom: 18,
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }).addTo(this.previewMap);
      } else if (format === 'WMS') {
        const selectedLayers = this.getSelectedWmsLayers();
        if (!selectedLayers) return;

        const wmsOptions: any = {
          layers: selectedLayers,
          version: this.layerEditForm.wmsVersion || '1.3.0',
          format: this.layerEditForm.wmsTransparent ? 'image/png' : 'image/jpeg',
          transparent: this.layerEditForm.wmsTransparent
        };

        if (this.layerEditForm.wmsStyles) {
          wmsOptions.styles = this.layerEditForm.wmsStyles;
        }

        this.previewMapLayer = L.tileLayer.wms(url, wmsOptions).addTo(this.previewMap);

        const firstSelectedLayer = this.wmsLayers.find(l => this.selectedWmsLayers[l.Name]);
        if (firstSelectedLayer?.EX_GeographicBoundingBox) {
          const extent = firstSelectedLayer.EX_GeographicBoundingBox;
          const bounds = L.latLngBounds(
            [extent[1], extent[0]],
            [extent[3], extent[2]]
          );
          this.previewMap.fitBounds(bounds);
        }
      }

      setTimeout(() => {
        if (this.previewMap) {
          this.previewMap.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error updating preview map:', error);
      this.snackBar.open('Failed to load layer in preview. Please check your configuration.', 'Close', { duration: 3000 });
    }
  }

  /**
   * Filters WMS layers based on search query
   */
  filteredWmsLayers(): any[] {
    if (!this.wmsLayerSearchQuery || this.wmsLayerSearchQuery.trim() === '') {
      return this.wmsLayers;
    }

    const query = this.wmsLayerSearchQuery.toLowerCase();
    return this.wmsLayers.filter(layer =>
      layer.Title?.toLowerCase().includes(query) ||
      layer.Name?.toLowerCase().includes(query) ||
      layer.Abstract?.toLowerCase().includes(query)
    );
  }

  /**
   * Filters unavailable WMS layers based on search query
   */
  filteredWmsOtherLayers(): any[] {
    if (!this.wmsLayerSearchQuery || this.wmsLayerSearchQuery.trim() === '') {
      return this.wmsOtherLayers;
    }

    const query = this.wmsLayerSearchQuery.toLowerCase();
    return this.wmsOtherLayers.filter(layer =>
      layer.Title?.toLowerCase().includes(query) ||
      layer.Name?.toLowerCase().includes(query) ||
      layer.Abstract?.toLowerCase().includes(query)
    );
  }

  /**
   * Gets selected WMS layer names as comma-separated string
   */
  getSelectedWmsLayers(): string {
    return Object.keys(this.selectedWmsLayers)
      .filter(name => this.selectedWmsLayers[name])
      .join(',');
  }
}

