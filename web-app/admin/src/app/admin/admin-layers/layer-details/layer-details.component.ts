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
import { ImageryLayerConfig } from '../imagery-layer-settings/imagery-layer-settings.component';

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
    format: '',
    base: false
  };

  imageryConfig: ImageryLayerConfig = {
    url: '',
    format: 'XYZ',
    wmsVersion: '1.3.0',
    wmsTransparent: true,
    wmsStyles: ''
  };
  selectedWmsLayersString: string = '';

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

      if (this.layer?.type === 'Imagery') {
        this.layerEditForm.format = this.layer.format || 'XYZ';
        this.layerEditForm.base = !!this.layer.base;

        this.imageryConfig = {
          url: this.layer.url || '',
          format: this.layer.format || 'XYZ',
          wmsVersion: this.layer.wms?.version || '1.3.0',
          wmsTransparent: this.layer.wms?.transparent !== false,
          wmsStyles: this.layer.wms?.styles || ''
        };

        if (this.layer.format === 'WMS' && this.layer.wms?.layers) {
          this.selectedWmsLayersString = this.layer.wms.layers;
        }
      }
    }
    this.editingDetails = !this.editingDetails;
  }

  /**
   * Handles imagery config changes from the helper component
   */
  onImageryConfigChange(config: ImageryLayerConfig): void {
    this.imageryConfig = config;
  }

  /**
   * Handles WMS layer selection changes from the helper component
   */
  onWmsLayersSelected(layers: string): void {
    this.selectedWmsLayersString = layers;
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

    if (this.layer.type === 'Imagery') {
      updatedLayer.url = this.imageryConfig.url;
      updatedLayer.format = this.imageryConfig.format;
      updatedLayer.base = this.layerEditForm.base;

      if (this.imageryConfig.format === 'WMS') {
        updatedLayer.wms = {
          layers: this.selectedWmsLayersString || '',
          version: this.imageryConfig.wmsVersion,
          transparent: this.imageryConfig.wmsTransparent,
          format: this.imageryConfig.wmsTransparent ? 'image/png' : 'image/jpeg',
          styles: this.imageryConfig.wmsStyles || ''
        };
      }
    }

    this.layersService.updateLayer(String(this.layer.id), updatedLayer)
      .subscribe({
        next: (updated) => {
          this.layer = { ...this.layer, ...updated };
          this.editingDetails = false;
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
}

