import { Component, DestroyRef, ElementRef, OnInit, OnDestroy, TemplateRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';

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
import { LayerPreviewComponent } from '../layer-preview/layer-preview.component';
import { MageEvent } from 'mage-web-app/entities/event/entities.event';
import { Observable } from 'rxjs';
import { layerIconName } from '../../../entities/layer/entities.layer';
import { SessionService } from 'mage-web-app/http/session.service';
import { RouteReuse } from '../../../route-reuse.strategy';

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
    imports: [
        FormsModule,
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatDividerModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatFormFieldModule,
        MatInputModule,
        MatListModule,
        MatPaginatorModule,
        LayerPreviewComponent
    ]
})
export class LayerDetailsComponent implements OnInit, OnDestroy {
  static readonly routeReuse: RouteReuse = RouteReuse.RecreateOnParamChange;

  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly layersService: LayersService = inject(LayersService);
  private readonly eventsService: AdminEventsService = inject(AdminEventsService);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly http: HttpClient = inject(HttpClient);
  private readonly sessionService: SessionService = inject(SessionService);
  private readonly breadcrumbService: AdminBreadcrumbService = inject(AdminBreadcrumbService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly layerId: string | null = this.route.snapshot.paramMap.get('layerId');

  private destroyed = false;

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

  breadcrumbActions = viewChild.required<TemplateRef<unknown>>('breadcrumbActions');

  readonly layer = signal<Layer | undefined>(undefined);
  readonly urlLayers = signal<UrlLayer[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly loadingEvents = signal(true);
  eventsPageIndex = 0;
  eventsPageSize = 5;
  readonly eventsPage = signal<PagedResult<MageEvent>>({ items: [], totalCount: 0 });
  eventSearchTerm = '';
  readonly layerEvents = signal<MageEvent[]>([]);
  pageSizeOptions = [5, 10, 25];

  readonly upload = signal<UploadItem>({});
  readonly completedUploads = signal<UploadStatus[]>([]);
  readonly isUploading = signal(false);

  fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  get hasLayerEditPermission(): boolean {
    return this.sessionService.hasPermission('UPDATE_LAYER');
  }

  get hasLayerDeletePermission(): boolean {
    return this.sessionService.hasPermission('DELETE_LAYER');
  }

  private get myself(): any | null {
    return this.sessionService.user;
  }

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions());

    if (!this.layerId) {
      console.error('No layerId found in route params');
      this.error.set('No layer id provided.');
      this.loading.set(false);
      return;
    }

    this.loadLayer(this.layerId);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
    this.destroyed = true;
  }

  private loadLayer(layerId: string): void {
    this.loading.set(true);
    this.layersService.getLayerById(layerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (layer) => {
          this.layer.set(layer);
          this.loading.set(false);

          this.breadcrumbs = [this.breadcrumbs[0], { title: layer.name || 'Layer Details' }];

          if (layer.state !== 'available') {
            setTimeout(() => this.checkLayerProcessingStatus(), 1000);
          }

          this.updateUrlLayers();
          this.getEventsPage();
        },
        error: (error) => {
          console.error('Error loading layer:', error);
          this.loading.set(false);
          const message = error?.message || 'Failed to load layer';
          this.error.set(message);
          this.snackBar.open('Error loading layer: ' + message, 'Close', {
            duration: 5000
          });
        }
      });
  }

  private updateUrlLayers(): void {
    const layer = this.layer();
    if (!layer) {
      this.urlLayers.set([]);
      return;
    }

    const token = this.sessionService.getToken();
    const mapping: UrlLayer[] = [];

    if (layer.tables) {
      layer.tables.forEach((table) => {
        mapping.push({
          table: table.name,
          url: `/api/layers/${layer.id}/${table.name}/{z}/{x}/{y}.png?access_token=${token}`
        });
      });
    }

    this.urlLayers.set(mapping);
  }

  /** Loads paginated events for the current layer using server-side pagination. */
  getEventsPage(): void {
    const layer = this.layer();
    if (!layer?.id) {
      this.loadingEvents.set(false);
      return;
    }

    this.loadingEvents.set(true);

    const searchOptions: any = {
      page: this.eventsPageIndex,
      page_size: this.eventsPageSize,
      layerId: String(layer.id)
    };

    if (this.eventSearchTerm) {
      searchOptions.term = this.eventSearchTerm;
    }

    this.eventsService.getEvents(searchOptions)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const layerEvents = response.items || [];

          this.eventsPage.set({
            items: layerEvents,
            totalCount: response.totalCount || layerEvents.length,
            pageSize: this.eventsPageSize,
            pageIndex: this.eventsPageIndex
          });

          this.layerEvents.set(layerEvents);
          this.loadingEvents.set(false);
        },
        error: (error) => {
          console.error('Error loading events:', error);
          this.loadingEvents.set(false);
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
    const layer = this.layer();
    if (!layer?.id) return;

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
              excludeLayerId: String(layer.id)
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
      if (result?.selectedItem && layer.id) {
        const selectedEvent = result.selectedItem;

        this.eventsService.addLayerToEvent(String(selectedEvent.id), { id: layer.id }).subscribe({
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
    const layer = this.layer();
    if (!layer?.id) return;
    mouseEvent?.stopPropagation();

    const layerId = layer.id;

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
    const layer = this.layer();
    if (!layer) return;

    const dialogRef = this.dialog.open(CreateLayerDialogComponent, {
      width: '600px',
      data: { layer }
    });

    dialogRef.afterClosed().subscribe((updatedLayer?: Layer) => {
      if (!updatedLayer) return;

      const nextLayer = { ...layer, ...updatedLayer };
      this.layer.set(nextLayer);
      this.breadcrumbs = [this.breadcrumbs[0], { title: nextLayer.name || 'Layer Details' }];
      this.updateUrlLayers();
      this.snackBar.open('Layer updated successfully', undefined, { duration: 2000 });
    });
  }

  deleteLayer(): void {
    const layer = this.layer();
    if (!layer) return;

    const dialogRef = this.dialog.open(DeleteLayerComponent, {
      width: '600px',
      data: { layer }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Layer deleted successfully', 'Close', { duration: 3000 });

        this.router.navigate(['../../layers'], { relativeTo: this.route });
      }
    });
  }

  isLayerFileBased(): boolean {
    return !!this.layer()?.file;
  }

  layerIcon(layer: Layer): string {
    return layerIconName(layer);
  }

  downloadLayer(): void {
    const layer = this.layer();
    if (!layer?.id || !layer.file) return;

    const accessToken = this.sessionService.getToken();
    const downloadURL = `/api/layers/${layer.id}/file?access_token=${accessToken}`;

    const a = document.createElement('a');
    a.href = downloadURL;
    a.download = layer.file.name;
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
        const error = `Invalid file type. Please upload a KML, KMZ, or ZIP file.`;
        this.upload.update((u) => ({ ...u, error }));
        this.snackBar.open(error, 'Close', { duration: 5000 });
        return;
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        const error = `File size exceeds 50MB limit.`;
        this.upload.update((u) => ({ ...u, error }));
        this.snackBar.open(error, 'Close', { duration: 5000 });
        return;
      }

      this.upload.update((u) => ({ ...u, file, error: undefined }));
      this.confirmUpload();
    }
  }

  clearUpload(): void {
    this.upload.set({});
    const fileInput = this.fileInputRef();
    if (fileInput) {
      fileInput.nativeElement.value = '';
    }
  }

  confirmUpload(): void {
    const layer = this.layer();
    if (!layer) return;

    const file = this.upload().file;
    if (!file) {
      this.snackBar.open('Please select a file to upload', 'Close', { duration: 3000 });
      return;
    }

    if (layer.type !== 'Feature') {
      this.snackBar.open(
        `Cannot upload to layer of type "${layer.type}". Only Feature (Static) layers support file uploads.`,
        'Close',
        { duration: 5000 }
      );
      return;
    }

    this.isUploading.set(true);
    this.upload.update((u) => ({ ...u, uploading: true, error: undefined }));

    this.uploadFile(file).subscribe({
      next: (response) => {
        this.isUploading.set(false);

        const fileInfo = response.files && response.files[0];
        const featuresCreated = fileInfo ? fileInfo.features : 0;

        this.completedUploads.update((uploads) => [...uploads, { name: file.name, features: featuresCreated }]);
        this.snackBar.open(`Successfully uploaded ${file.name}`, 'Close', { duration: 3000 });
        this.layer.update((l) => ({ ...(l as any), _timestamp: Date.now() }));

        this.clearUpload();
      },
      error: (error) => {
        this.isUploading.set(false);

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

        this.upload.update((u) => ({ ...u, uploading: false, error: `${file.name}: ${errorMessage}` }));
        this.completedUploads.update((uploads) => [...uploads, { name: file.name, error: errorMessage }]);

        this.snackBar.open(`Failed to upload ${file.name}: ${errorMessage}`, 'Close', { duration: 8000 });
      }
    });
  }

  private uploadFile(file: File): Observable<any> {
    const layer = this.layer();
    if (!layer?.id) {
      return new Observable((observer) => {
        observer.error(new Error('No layer loaded'));
      });
    }

    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = `/api/layers/${layer.id}/kml`;
    return this.http.post<any>(uploadUrl, formData);
  }

  confirmCreateLayer(): void {
    this.snackBar.open('Creating layer...', undefined, { duration: 2000 });
    setTimeout(() => this.checkLayerProcessingStatus(), 1500);
  }

  private checkLayerProcessingStatus(): void {
    if (this.destroyed) return;

    const layerId = this.layerId;
    if (!layerId) return;

    this.layersService.getLayerById(layerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((layer) => {
        if (this.destroyed) return;

        this.layer.set(layer);
        this.updateUrlLayers();

        if (layer.state !== 'available') {
          setTimeout(() => this.checkLayerProcessingStatus(), 5000);
        }
      });
  }
}
