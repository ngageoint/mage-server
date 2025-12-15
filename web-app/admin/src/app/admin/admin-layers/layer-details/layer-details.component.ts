import { Component, OnInit, Inject } from '@angular/core';
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

  // Event filtering and pagination
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

  // Legacy event properties (keeping for compatibility)
  eventSearch = '';
  filteredEvents: Event[] = [];
  eventsPage_old = 0;
  eventsPerPage = 10;
  editEvent = false;
  selectedEvent: Event | null = null;

  // Upload management
  uploads: UploadItem[] = [{}];
  uploadConfirmed = false;
  uploadStatuses: { [key: number]: UploadStatus } = {};
  completedUploads: UploadStatus[] = [];
  uploadMessage = '';
  fileUploadUrl = '';
  isUploading = false;

  // Permissions
  hasLayerEditPermission = false;
  hasLayerDeletePermission = false;

  // Inline editing
  editingDetails = false;
  layerEditForm = {
    name: '',
    description: ''
  };

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
    console.log('LayerDetailsComponent ngOnInit called');
    console.log('State params:', this.stateService.params);

    const layerId = this.stateService.params.layerId;
    console.log('Layer ID:', layerId);

    if (!layerId) {
      console.error('No layerId found in route params');
      return;
    }

    // Set permissions
    console.log('UserService.myself:', this.userService.myself);
    const permissions = this.userService.myself?.role?.permissions || [];
    this.hasLayerEditPermission = permissions.includes('UPDATE_LAYER');
    this.hasLayerDeletePermission = permissions.includes('DELETE_LAYER');
    console.log('Permissions:', { hasLayerEditPermission: this.hasLayerEditPermission, hasLayerDeletePermission: this.hasLayerDeletePermission });

    // Set upload URL
    this.fileUploadUrl = `/api/layers/${layerId}/kml?access_token=${this.localStorageService.getToken()}`;

    // Load layer
    this.loadLayer(layerId);

    // Load events
    this.loadEvents(layerId);

    // Initialize action buttons
    this.updateActionButtons();
  }

  private loadLayer(layerId: string): void {
    console.log('Loading layer with ID:', layerId);
    this.loading = true;
    this.layersService.getLayerById(layerId).subscribe({
      next: (layer) => {
        console.log('Layer loaded successfully:', layer);
        this.layer = layer;
        this.loading = false;
        this.breadcrumbs.push({
          title: layer.name || 'Layer Details'
        });

        if (this.layer.state !== 'available') {
          setTimeout(() => this.checkLayerProcessingStatus(), 1000);
        }

        this.updateUrlLayers();
      },
      error: (error) => {
        console.error('Error loading layer:', error);
        this.loading = false;
        this.error = error.message || 'Failed to load layer';
        this.snackBar.open('Error loading layer: ' + this.error, 'Close', { duration: 5000 });
      }
    });
  }

  private loadEvents(layerId: string): void {
    console.log('Loading events for layer:', layerId);
    // Load the first page of events immediately
    this.getEventsPage();
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

    this.loadingEvents = true;

    // Build search options for server-side pagination
    const searchOptions: any = {
      page: this.eventsPageIndex,
      page_size: this.eventsPageSize
    };

    if (this.eventSearchTerm) {
      searchOptions.term = this.eventSearchTerm;
    }

    // Get all events and filter client-side for now
    // (Since there's no direct API endpoint for events by layer with pagination)
    this.eventsService.getEvents(searchOptions).subscribe({
      next: (response) => {
        console.log('Events page loaded:', response);
        const allEvents = response.items || [];

        // Filter events that have this layer
        const layerEvents = allEvents.filter(event =>
          event.layers?.some(l => l.id === this.layer.id)
        );

        // Update the layerEvents array for other operations
        if (this.eventsPageIndex === 0) {
          this.layerEvents = layerEvents;
        }

        // For non-layer events, get all events without pagination for the add dialog
        if (this.eventsPageIndex === 0 && !this.eventSearchTerm) {
          this.nonLayerEvents = allEvents.filter(event =>
            !event.layers?.some(l => l.id === this.layer.id)
          );

          // Further filter based on permissions
          if (!this.userService.myself?.role?.permissions?.includes('UPDATE_EVENT')) {
            this.nonLayerEvents = this.nonLayerEvents.filter(event => {
              const permissions = event.acl?.[this.userService.myself.id]?.permissions || [];
              return permissions.includes('update');
            });
          }
        }

        this.eventsPage = {
          items: layerEvents,
          totalCount: layerEvents.length,
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
            this.eventsService.getEvents({}).subscribe({
              next: (response) => {
                const allEvents = response.items || [];

                // Filter out events that already have this layer
                let filteredEvents = allEvents.filter(event =>
                  !event.layers?.some(l => l.id === this.layer.id)
                );

                // Further filter based on permissions
                if (!this.userService.myself?.role?.permissions?.includes('UPDATE_EVENT')) {
                  filteredEvents = filteredEvents.filter(event => {
                    const permissions = event.acl?.[this.userService.myself.id]?.permissions || [];
                    return permissions.includes('update');
                  });
                }

                // Apply search term filter
                if (searchTerm) {
                  filteredEvents = filteredEvents.filter(event =>
                    event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    event.description?.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                }

                // Paginate results
                const start = page * pageSize;
                const paginatedEvents = filteredEvents.slice(start, start + pageSize);

                observer.next({
                  items: paginatedEvents,
                  totalCount: filteredEvents.length,
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
        this.eventsService.addLayerToEvent(String(result.selectedItem.id), { id: this.layer.id }).subscribe({
          next: () => {
            // Reload events to update the list
            this.loadEvents(String(this.layer.id));
            this.snackBar.open('Layer added to event', null, { duration: 2000 });
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
          // Reload events to update the list
          this.loadEvents(String(this.layer.id));
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
    }
    this.editingDetails = !this.editingDetails;
  }

  saveLayerDetails(): void {
    if (!this.layer?.id) {
      return;
    }

    const updatedLayer = {
      name: this.layerEditForm.name,
      description: this.layerEditForm.description,
      type: this.layer.type // Required by server validation
    };

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

      // Validate file type
      const validExtensions = ['.kml', '.kmz', '.zip'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        this.uploads[index].error = `Invalid file type. Please upload a KML or KMZ file.`;
        this.snackBar.open(this.uploads[index].error, 'Close', { duration: 5000 });
        return;
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        this.uploads[index].error = `File size exceeds 50MB limit.`;
        this.snackBar.open(this.uploads[index].error, 'Close', { duration: 5000 });
        return;
      }

      this.uploads[index].file = file;
      this.uploads[index].error = undefined;
      console.log(`File selected for upload ${index}:`, file.name);
    }
  }

  confirmUpload(): void {
    // Validate that at least one file is selected
    const filesSelected = this.uploads.filter(u => u.file).length;

    if (filesSelected === 0) {
      this.snackBar.open('Please select at least one file to upload', 'Close', { duration: 3000 });
      return;
    }

    // Check layer type before uploading
    if (this.layer.type !== 'Feature') {
      this.snackBar.open(`Cannot upload to layer of type "${this.layer.type}". Only Feature (Static) layers support file uploads.`, 'Close', { duration: 5000 });
      return;
    }

    this.isUploading = true;
    let uploadCount = 0;
    let successCount = 0;
    let errorCount = 0;

    // Clear previous upload results
    this.completedUploads = [];

    // Upload each file
    this.uploads.forEach((upload, index) => {
      if (upload.file) {
        uploadCount++;
        upload.uploading = true;
        upload.error = undefined;

        this.uploadFile(upload.file, index).subscribe({
          next: (response) => {
            upload.uploading = false;
            successCount++;

            console.log(`Upload ${index} successful - full response:`, response);

            // Server returns { files: [{ name, size, features }] }
            const fileInfo = response.files && response.files[0];
            const featuresCreated = fileInfo ? fileInfo.features : 0;

            // Store upload status on the upload item
            upload.uploadStatus = {
              name: upload.file.name,
              features: featuresCreated
            };

            // Also store in the statuses object for backward compatibility
            this.uploadStatuses[index] = upload.uploadStatus;

            console.log(`Upload ${index} created ${featuresCreated} features`);

            // Check if all uploads are complete
            if (successCount + errorCount === uploadCount) {
              this.onAllUploadsComplete(successCount, errorCount);
            }
          },
          error: (error) => {
            upload.uploading = false;

            // Extract detailed error message - try multiple sources
            let errorMessage = 'Upload failed';

            // Try to get the actual server response text
            if (typeof error.error === 'string' && error.error.trim()) {
              errorMessage = error.error;
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.message) {
              errorMessage = error.message;
            } else if (error.statusText) {
              errorMessage = error.statusText;
            }

            // Add status code to message if available
            if (error.status && error.status !== 0) {
              errorMessage = `${error.status}: ${errorMessage}`;
            }

            // Include filename in error message
            upload.error = `${upload.file.name}: ${errorMessage}`;

            // Store error status on the upload item for display
            upload.uploadStatus = {
              name: upload.file.name,
              error: errorMessage
            };

            errorCount++;

            console.error(`Upload ${index} failed:`, {
              fullError: error,
              status: error.status,
              statusText: error.statusText,
              errorBody: error.error,
              errorType: typeof error.error,
              message: errorMessage,
              headers: error.headers,
              url: error.url
            });

            this.snackBar.open(`Failed to upload ${upload.file.name}: ${errorMessage}`, 'Close', { duration: 8000 });

            // Check if all uploads are complete
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

    console.log('Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      layerId: this.layer.id,
      layerType: this.layer.type,
      url: uploadUrl
    });

    // The TokenInterceptorService will automatically add the Bearer token
    return this.http.post<any>(uploadUrl, formData);
  }

  private onAllUploadsComplete(successCount: number, errorCount: number): void {
    this.isUploading = false;

    // Save completed upload statuses (both successful and failed)
    const successfulUploads = this.uploads
      .filter(upload => upload.uploadStatus)
      .map(upload => upload.uploadStatus);

    this.completedUploads = [...this.completedUploads, ...successfulUploads];

    // Show summary message
    if (successCount > 0 && errorCount === 0) {
      this.snackBar.open(`Successfully uploaded ${successCount} file(s)`, 'Close', { duration: 3000 });

      // Trigger preview refresh by creating a new layer object reference
      // The timestamp property forces Angular change detection to recognize the layer has changed
      this.layer = { ...this.layer, _timestamp: Date.now() } as any;
    } else if (successCount > 0 && errorCount > 0) {
      this.snackBar.open(`Uploaded ${successCount} file(s), ${errorCount} failed`, 'Close', { duration: 5000 });

      // Trigger preview refresh by creating a new layer object reference
      this.layer = { ...this.layer, _timestamp: Date.now() } as any;
    }

    // Clear all uploaded files (both successful and failed)
    this.uploads = [{}];
    // Individual errors are already shown via snackBar in the error handler
  }

  removeUploadFile(index: number): void {
    if (this.uploads.length > 1) {
      this.uploads.splice(index, 1);
      delete this.uploadStatuses[index];
    } else {
      // Keep at least one upload slot
      this.uploads[0] = {};
      delete this.uploadStatuses[0];
    }
  }

  confirmCreateLayer(): void {
    // Call makeAvailable API
    // This would need to be added to LayersService
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
