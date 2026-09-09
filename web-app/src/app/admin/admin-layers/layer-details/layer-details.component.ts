import { Component, ElementRef, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent as PageEvent } from '@angular/material/paginator';
import { MatTableDataSource as MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';

import { LayersService, Layer } from '../layers.service';
import { AdminEventsService } from '../../services/admin-events.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import {
  SearchModalComponent,
  SearchModalData,
  SearchModalResult,
  SearchModalColumn
} from '../../search-modal/search-modal.component';
import { DeleteLayerComponent } from '../delete-layer/delete-layer.component';
import { CreateLayerDialogComponent } from '../create-layer/create-layer.component';
import { MageEvent } from 'mage-web-app/entities/event/entities.event';
import { Observable } from 'rxjs';
import { layerIconName } from '../../../entities/layer/entities.layer';
import { SessionService } from 'mage-web-app/http/session.service';

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
    styleUrls: ['./layer-details.component.scss'],
    standalone: false
})
export class LayerDetailsComponent implements OnInit, OnDestroy {
  private _breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Layers',
    icon: 'map',
    route: ['/admin/layers']
  }];
  set breadcrumbs(value: AdminBreadcrumb[]) {
    this._breadcrumbs = value;
    this.breadcrumbService.setBreadcrumbs(value);
  }
  get breadcrumbs(): AdminBreadcrumb[] {
    return this._breadcrumbs;
  }

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  layer?: Layer;
  layerEvents: MageEvent[] = [];
  nonLayerEvents: MageEvent[] = [];
  urlLayers: UrlLayer[] = [];
  loading = true;
  error: string | null = null;

  loadingEvents = true;
  eventsPageIndex = 0;
  eventsPageSize = 5;
  eventsPage: PagedResult<MageEvent> = { items: [], totalCount: 0 };
  eventSearchTerm = '';
  eventsDataSource = new MatTableDataSource<MageEvent>();
  pageSizeOptions = [5, 10, 25];

  upload: UploadItem = {};
  completedUploads: UploadStatus[] = [];
  isUploading = false;

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  get hasLayerEditPermission(): boolean {
    return this.sessionService.hasPermission('UPDATE_LAYER');
  }

  get hasLayerDeletePermission(): boolean {
    return this.sessionService.hasPermission('DELETE_LAYER');
  }

  private get myself(): any | null {
    return this.sessionService.user;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private layersService: LayersService,
    private eventsService: AdminEventsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private sessionService: SessionService,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    const layerId = this.route.snapshot.paramMap.get('layerId');
    if (!layerId) {
      console.error('No layerId found in route params');
      this.error = 'No layer id provided.';
      this.loading = false;
      return;
    }

    this.loadLayer(layerId);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  private loadLayer(layerId: string): void {
    this.loading = true;
    this.layersService.getLayerById(layerId).subscribe({
      next: (layer) => {
        this.layer = layer;
        this.loading = false;

        this.breadcrumbs = [this.breadcrumbs[0], { title: layer.name || 'Layer Details' }];

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

    const token = this.sessionService.getToken();
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

  addEventToLayer(): void {
    if (!this.layer?.id) return;

    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Event to Layer',
        searchPlaceholder: 'Search for events to add...',
        type: 'events',
        icon: 'event',
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
            displayFunction: (event: MageEvent) => event.name || 'Unnamed Event',
            width: '50%'
          },
          {
            key: 'description',
            label: 'Description',
            displayFunction: (event: MageEvent) => event.description || '',
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

  removeEventFromLayer(event: MageEvent, mouseEvent?: MouseEvent): void {
    if (!this.layer?.id) return;
    mouseEvent?.stopPropagation();

    const layerId = this.layer.id;

    this.eventsService.removeLayerFromEvent(event.id.toString(), layerId).subscribe({
      next: () => {
        this.getEventsPage();

        const snackBarRef = this.snackBar.open(`Removed ${event.name} from layer`, 'Undo', { duration: 5000 });
        snackBarRef.onAction().subscribe(() => {
          this.eventsService.addLayerToEvent(event.id.toString(), { id: layerId }).subscribe({
            next: () => this.getEventsPage(),
            error: (error) => {
              console.error('Error restoring event:', error);
              this.snackBar.open('Error restoring event', 'Close', { duration: 5000 });
            }
          });
        });
      },
      error: (error) => {
        console.error('Error removing layer from event:', error);
        this.snackBar.open('Error removing layer from event', 'Close', { duration: 5000 });
      }
    });
  }

  editLayerDetails(): void {
    if (!this.layer) return;

    const dialogRef = this.dialog.open(CreateLayerDialogComponent, {
      width: '600px',
      data: { layer: this.layer }
    });

    dialogRef.afterClosed().subscribe((updatedLayer?: Layer) => {
      if (!updatedLayer) return;

      this.layer = { ...this.layer!, ...updatedLayer };
      this.breadcrumbs = [this.breadcrumbs[0], { title: this.layer.name || 'Layer Details' }];
      this.updateUrlLayers();
      this.snackBar.open('Layer updated successfully', undefined, { duration: 2000 });
    });
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

  layerIcon(layer: Layer): string {
    return layerIconName(layer);
  }

  downloadLayer(): void {
    if (!this.layer?.id || !this.layer.file) return;

    const accessToken = this.sessionService.getToken();
    const downloadURL = `/api/layers/${this.layer.id}/file?access_token=${accessToken}`;

    const a = document.createElement('a');
    a.href = downloadURL;
    a.download = this.layer.file.name;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  onFileSelected(event: any): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const validExtensions = ['.kml', '.kmz', '.zip'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        this.upload.error = `Invalid file type. Please upload a KML, KMZ, or ZIP file.`;
        this.snackBar.open(this.upload.error, 'Close', { duration: 5000 });
        return;
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        this.upload.error = `File size exceeds 50MB limit.`;
        this.snackBar.open(this.upload.error, 'Close', { duration: 5000 });
        return;
      }

      this.upload.file = file;
      this.upload.error = undefined;
      this.confirmUpload();
    }
  }

  clearUpload(): void {
    this.upload = {};
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  confirmUpload(): void {
    if (!this.layer) return;

    const file = this.upload.file;
    if (!file) {
      this.snackBar.open('Please select a file to upload', 'Close', { duration: 3000 });
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
    this.upload.uploading = true;
    this.upload.error = undefined;

    this.uploadFile(file).subscribe({
      next: (response) => {
        this.isUploading = false;

        const fileInfo = response.files && response.files[0];
        const featuresCreated = fileInfo ? fileInfo.features : 0;

        this.completedUploads = [...this.completedUploads, { name: file.name, features: featuresCreated }];
        this.snackBar.open(`Successfully uploaded ${file.name}`, 'Close', { duration: 3000 });
        this.layer = { ...(this.layer as any), _timestamp: Date.now() };

        this.clearUpload();
      },
      error: (error) => {
        this.isUploading = false;
        this.upload.uploading = false;

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

        this.upload.error = `${file.name}: ${errorMessage}`;
        this.completedUploads = [...this.completedUploads, { name: file.name, error: errorMessage }];

        this.snackBar.open(`Failed to upload ${file.name}: ${errorMessage}`, 'Close', { duration: 8000 });
      }
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
