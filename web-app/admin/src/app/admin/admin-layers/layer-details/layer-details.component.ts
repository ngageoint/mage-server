import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';

import { LayersService, Layer } from '../layers.service';
import { AdminEventsService } from '../../services/admin-events.service';
import { LocalStorageService } from '../../../../../../../web-app/src/app/http/local-storage.service'
import { AdminUserService } from '../../services/admin-user.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { CardActionButton } from '../../../core/card-navbar/card-navbar.component';
import {
  SearchModalComponent,
  SearchModalData,
  SearchModalResult,
  SearchModalColumn
} from '../../../core/search-modal/search-modal.component';
import { DeleteLayerComponent } from '../delete-layer/delete-layer.component';
import { Event } from '../../../../../../src/app/filter/filter.types';
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
      route: ['../']
    }
  ];

  layer?: Layer;
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
  uploadStatuses: { [key: number]: UploadStatus } = {};
  completedUploads: UploadStatus[] = [];
  isUploading = false;

  hasLayerEditPermission = false;
  hasLayerDeletePermission = false;

  private myself: any | null = null;

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private layersService: LayersService,
    private eventsService: AdminEventsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private localStorageService: LocalStorageService,
    private adminUserService: AdminUserService
  ) {}

  ngOnInit(): void {
    const layerId = this.route.snapshot.paramMap.get('layerId');
    if (!layerId) {
      console.error('No layerId found in route params');
      this.error = 'No layer id provided.';
      this.loading = false;
      return;
    }

    this.adminUserService.getMyself().subscribe({
      next: (myself) => {
        this.myself = myself;

        const permissions: string[] = myself?.role?.permissions || [];
        this.hasLayerEditPermission = permissions.includes('UPDATE_LAYER');
        this.hasLayerDeletePermission = permissions.includes('DELETE_LAYER');

        this.updateActionButtons();
      },
      error: () => {
        this.myself = null;
        this.hasLayerEditPermission = false;
        this.hasLayerDeletePermission = false;

        this.updateActionButtons();
      }
    });

    this.loadLayer(layerId);
  }

  private loadLayer(layerId: string): void {
    this.loading = true;
    this.layersService.getLayerById(layerId).subscribe({
      next: (layer) => {
        this.layer = layer;
        this.loading = false;

        this.breadcrumbs = [
          this.breadcrumbs[0],
          { title: layer.name || 'Layer Details' }
        ];

        if (this.layer.state !== 'available') {
          setTimeout(() => this.checkLayerProcessingStatus(), 1000);
        }

        this.updateUrlLayers();
        this.getEventsPage();
      },
      error: (error) => {
        console.error('Error loading layer:', error);
        this.loading = false;
        this.error = error?.message || 'Failed to load layer';
        this.snackBar.open('Error loading layer: ' + this.error, 'Close', {
          duration: 5000
        });
      }
    });
  }

  private updateUrlLayers(): void {
    if (!this.layer) {
      this.urlLayers = [];
      return;
    }

    const token = this.localStorageService.getToken();
    const mapping: UrlLayer[] = [];

    if (this.layer.tables) {
      this.layer.tables.forEach((table) => {
        mapping.push({
          table: table.name,
          url: `/api/layers/${this.layer!.id}/${table.name}/{z}/{x}/{y}.png?access_token=${token}`
        });
      });
    }

    this.urlLayers = mapping;
  }

  /** Configures action buttons for events section. */
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

  /** Loads paginated events for the current layer using server-side pagination. */
  getEventsPage(): void {
    if (!this.layer?.id) {
      this.loadingEvents = false;
      return;
    }

    this.loadingEvents = true;

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

  onEventSearchChange(searchTerm?: string): void {
    this.eventSearchTerm = searchTerm || '';
    this.eventsPageIndex = 0;
    this.getEventsPage();
  }

  onEventsPageChange(event: PageEvent): void {
    this.eventsPageIndex = event.pageIndex;
    this.eventsPageSize = event.pageSize;
    this.getEventsPage();
  }

  toggleEditEvents(): void {
    this.editEvents = !this.editEvents;
    this.updateActionButtons();
  }

  addEventToLayer(): void {
    if (!this.layer?.id) return;

    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Events to Layer',
        searchPlaceholder: 'Search for events to add...',
        type: 'events',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return new Observable((observer) => {
            const searchOptions: any = {
              page,
              page_size: pageSize,
              excludeLayerId: String(this.layer!.id)
            };

            if (searchTerm) {
              searchOptions.term = searchTerm;
            }

            this.eventsService.getEvents(searchOptions).subscribe({
              next: (response) => {
                let filteredEvents = response.items || [];

                const myPerms: string[] = this.myself?.role?.permissions || [];
                const canUpdateAnyEvent = myPerms.includes('UPDATE_EVENT');
                const myId = this.myself?.id;

                if (!canUpdateAnyEvent) {
                  filteredEvents = filteredEvents.filter((ev) => {
                    const aclPerms = myId ? (ev.acl?.[myId]?.permissions || []) : [];
                    return aclPerms.includes('update');
                  });
                }

                observer.next({
                  items: filteredEvents,
                  totalCount: response.totalCount || filteredEvents.length,
                  pageSize,
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
      if (result?.selectedItem && this.layer?.id) {
        const selectedEvent = result.selectedItem;

        this.eventsService.addLayerToEvent(String(selectedEvent.id), { id: this.layer.id }).subscribe({
          next: () => {
            this.getEventsPage();
            this.snackBar.open(`Layer added to event: ${selectedEvent.name}`, undefined, { duration: 2000 });
          },
          error: (error) => {
            console.error('Error adding layer to event:', error);
            this.snackBar.open('Error adding layer to event', 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  removeEventFromLayer(event: Event, mouseEvent?: MouseEvent): void {
    if (!this.layer?.id) return;
    mouseEvent?.stopPropagation();

    this.eventsService.removeLayerFromEvent(event.id.toString(), this.layer.id).subscribe({
      next: () => {
        this.getEventsPage();
        this.snackBar.open('Layer removed from event', undefined, { duration: 2000 });
      },
      error: (error) => {
        console.error('Error removing layer from event:', error);
        this.snackBar.open('Error removing layer from event', 'Close', { duration: 5000 });
      }
    });
  }

  toggleEditDetails(): void {
    if (!this.layer) return;

    if (!this.editingDetails) {
      this.layerEditForm.name = this.layer.name || '';
      this.layerEditForm.description = this.layer.description || '';

      if (this.layer.type === 'Imagery') {
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
        } else {
          this.selectedWmsLayersString = '';
        }
      }
    }

    this.editingDetails = !this.editingDetails;
  }

  onImageryConfigChange(config: ImageryLayerConfig): void {
    this.imageryConfig = config;
  }

  onWmsLayersSelected(layers: string): void {
    this.selectedWmsLayersString = layers;
  }

  saveLayerDetails(): void {
    if (!this.layer?.id) return;

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

    this.layersService.updateLayer(String(this.layer.id), updatedLayer).subscribe({
      next: (updated) => {
        this.layer = { ...this.layer!, ...updated };
        this.editingDetails = false;
        this.snackBar.open('Layer updated successfully', undefined, { duration: 2000 });
      },
      error: (error) => {
        console.error('Error updating layer:', error);
        const errorMessage = error?.error?.message || error?.message || 'Unknown error';
        this.snackBar.open('Error updating layer: ' + errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  cancelEditDetails(): void {
    if (!this.layer) return;

    this.editingDetails = false;
    this.layerEditForm.name = this.layer.name || '';
    this.layerEditForm.description = this.layer.description || '';
  }

  deleteLayer(): void {
    if (!this.layer) return;

    const dialogRef = this.dialog.open(DeleteLayerComponent, {
      width: '600px',
      data: { layer: this.layer }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Layer deleted successfully', 'Close', { duration: 3000 });

        this.router.navigate(['../../layers'], { relativeTo: this.route });
      }
    });
  }

  isLayerFileBased(): boolean {
    return !!this.layer?.file;
  }

  downloadLayer(): void {
    if (!this.layer?.id || !this.layer.file) return;

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
        this.uploads[index].error = `Invalid file type. Please upload a KML, KMZ, or ZIP file.`;
        this.snackBar.open(this.uploads[index].error, 'Close', { duration: 5000 });
        return;
      }

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
    const filesSelected = this.uploads.filter((u) => u.file).length;

    if (!this.layer) return;

    if (filesSelected === 0) {
      this.snackBar.open('Please select at least one file to upload', 'Close', { duration: 3000 });
      return;
    }

    if (this.layer.type !== 'Feature') {
      this.snackBar.open(
        `Cannot upload to layer of type "${this.layer.type}". Only Feature (Static) layers support file uploads.`,
        'Close',
        { duration: 5000 }
      );
      return;
    }

    this.isUploading = true;
    let uploadCount = 0;
    let successCount = 0;
    let errorCount = 0;

    this.completedUploads = [];

    this.uploads.forEach((upload, index) => {
      if (!upload.file) return;

      uploadCount++;
      upload.uploading = true;
      upload.error = undefined;

      this.uploadFile(upload.file).subscribe({
        next: (response) => {
          upload.uploading = false;
          successCount++;

          const fileInfo = response.files && response.files[0];
          const featuresCreated = fileInfo ? fileInfo.features : 0;

          upload.uploadStatus = {
            name: upload.file!.name,
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

          upload.error = `${upload.file!.name}: ${errorMessage}`;
          upload.uploadStatus = {
            name: upload.file!.name,
            error: errorMessage
          };
          errorCount++;

          this.snackBar.open(`Failed to upload ${upload.file!.name}: ${errorMessage}`, 'Close', { duration: 8000 });

          if (successCount + errorCount === uploadCount) {
            this.onAllUploadsComplete(successCount, errorCount);
          }
        }
      });
    });
  }

  private uploadFile(file: File): Observable<any> {
    if (!this.layer?.id) {
      return new Observable((observer) => {
        observer.error(new Error('No layer loaded'));
      });
    }

    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = `/api/layers/${this.layer.id}/kml`;
    return this.http.post<any>(uploadUrl, formData);
  }

  private onAllUploadsComplete(successCount: number, errorCount: number): void {
    this.isUploading = false;

    const successfulUploads = this.uploads
      .filter((upload) => upload.uploadStatus)
      .map((upload) => upload.uploadStatus!);

    this.completedUploads = [...this.completedUploads, ...successfulUploads];

    if (successCount > 0 && errorCount === 0) {
      this.snackBar.open(`Successfully uploaded ${successCount} file(s)`, 'Close', { duration: 3000 });
      this.layer = { ...(this.layer as any), _timestamp: Date.now() };
    } else if (successCount > 0 && errorCount > 0) {
      this.snackBar.open(`Uploaded ${successCount} file(s), ${errorCount} failed`, 'Close', { duration: 5000 });
      this.layer = { ...(this.layer as any), _timestamp: Date.now() };
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
    this.snackBar.open('Creating layer...', undefined, { duration: 2000 });
    setTimeout(() => this.checkLayerProcessingStatus(), 1500);
  }

  private checkLayerProcessingStatus(): void {
    const layerId = this.route.snapshot.paramMap.get('layerId');
    if (!layerId) return;

    this.layersService.getLayerById(layerId).subscribe((layer) => {
      this.layer = layer;
      this.updateUrlLayers();

      if (this.layer.state !== 'available') {
        setTimeout(() => this.checkLayerProcessingStatus(), 5000);
      }
    });
  }
}
