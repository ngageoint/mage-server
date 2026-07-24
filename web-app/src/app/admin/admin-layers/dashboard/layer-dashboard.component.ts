import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { PageEvent as PageEvent } from '@angular/material/paginator';
import { LayersService, Layer } from '../layers.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { CreateLayerDialogComponent } from '../create-layer/create-layer.component';
import { AdminToastService } from '../../services/admin-toast.service';
import { layerIconName } from '../../../entities/layer/layer';
import { SessionService } from 'mage-web-app/http/session.service';

@Component({
    selector: 'mage-layer-dashboard',
    templateUrl: './layer-dashboard.component.html',
    styleUrls: ['./layer-dashboard.component.scss'],
    standalone: false
})
export class LayerDashboardComponent implements OnInit, OnDestroy {
  layers: Layer[] = [];
  filteredLayers: Layer[] = [];

  layerSearch = '';
  page = 0;
  itemsPerPage = 10;
  totalLayers = 0;
  pageSizeOptions = [5, 10, 25, 50];

  typeFilter: 'all' | 'online' | 'offline' = 'all';

  get hasLayerCreatePermission(): boolean {
    return this.sessionService.hasPermission('CREATE_LAYER');
  }

  breadcrumbs: AdminBreadcrumb[] = [{ title: 'Layers', icon: 'map' }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  constructor(
    private modal: MatDialog,
    private layersService: LayersService,
    private sessionService: SessionService,
    private toastService: AdminToastService,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.refreshLayers();
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  refreshLayers(): void {
    this.layersService.getLayers({ includeUnavailable: true }).subscribe({
      next: (layers) => {
        this.layers = layers ?? [];
        this.applyFilters();
      },
      error: (err) => console.error('Error fetching layers:', err)
    });
  }

  private applyFilters(): void {
    const term = this.layerSearch.trim().toLowerCase();

    this.filteredLayers = (this.layers ?? []).filter(layer => {
      const matchesSearch =
        !term ||
        (layer.name ?? '').toLowerCase().includes(term) ||
        (layer.description ?? '').toLowerCase().includes(term) ||
        (layer.url ?? '').toLowerCase().includes(term);

      const matchesType = this.filterByType(layer);

      return matchesSearch && matchesType;
    });

    this.totalLayers = this.filteredLayers.length;
  }

  private filterByType(layer: Layer): boolean {
    switch (this.typeFilter) {
      case 'all':
        return true;
      case 'online':
        return layer.type === 'Imagery';
      case 'offline':
        return layer.type !== 'Imagery';
      default:
        return true;
    }
  }

  getPaginatedLayers(): Layer[] {
    const startIndex = this.page * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredLayers.slice(startIndex, endIndex);
  }

  onSearchTermChanged(term: string): void {
    this.layerSearch = term;
    this.page = 0;
    this.applyFilters();
  }

  onSearchCleared(): void {
    this.layerSearch = '';
    this.page = 0;
    this.applyFilters();
  }

  onTypeFilterChange(type: 'all' | 'online' | 'offline'): void {
    this.typeFilter = type;
    this.page = 0;
    this.applyFilters();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.itemsPerPage = event.pageSize;
  }

  newLayer(): void {
    const dialogRef = this.modal.open(CreateLayerDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { layer: {} },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((newLayer: Layer | undefined) => {
      if (!newLayer?.id) return;

      this.toastService.show(
        'Layer Created',
        ['/admin/layers', newLayer.id],
        'Go to Layer'
      );

      this.refreshLayers();
    });
  }

  layerRoute(layer: Layer): any[] {
    return ['../layers', layer.id];
  }

  layerIcon(layer: Layer): string {
    return layerIconName(layer);
  }
}
