import { Component, OnInit, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';

import { LayersService, Layer } from '../layers.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { CreateLayerDialogComponent } from '../create-layer/create-layer.component';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminToastService } from '../../services/admin-toast.service';

@Component({
  selector: 'mage-layer-dashboard',
  templateUrl: './layer-dashboard.component.html',
  styleUrls: ['./layer-dashboard.component.scss']
})
export class LayerDashboardComponent implements OnInit {
  layers: Layer[] = [];
  filteredLayers: Layer[] = [];
  displayedColumns: string[] = ['layer'];

  layerSearch = '';
  page = 0;
  itemsPerPage = 10;
  totalLayers = 0;
  pageSizeOptions = [5, 10, 25, 50];

  numChars = 180;
  toolTipWidth = '1000px';

  typeFilter: 'all' | 'online' | 'offline' = 'all';

  hasLayerCreatePermission = false;
  hasLayerEditPermission = false;
  hasLayerDeletePermission = false;

  breadcrumbs: AdminBreadcrumb[] = [
    { title: 'Layers', iconClass: 'fa fa-map' }
  ];

  constructor(
    private modal: MatDialog,
    private layersService: LayersService,
    private adminUserService: AdminUserService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: AdminToastService
  ) {}

  ngOnInit(): void {
    this.initPermissions();
    this.refreshLayers();
    this.updateResponsiveLayout();
  }

  private initPermissions(): void {
    this.adminUserService.getMyself().subscribe({
      next: (myself) => {
        const permissions: string[] = myself?.role?.permissions || [];
        this.hasLayerCreatePermission = permissions.includes('CREATE_LAYER');
        this.hasLayerEditPermission = permissions.includes('UPDATE_LAYER');
        this.hasLayerDeletePermission = permissions.includes('DELETE_LAYER');
      },
      error: () => {
        this.hasLayerCreatePermission = false;
        this.hasLayerEditPermission = false;
        this.hasLayerDeletePermission = false;
      }
    });
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

  getTypeCount(type: 'all' | 'online' | 'offline'): number {
    if (type === 'all') return this.filteredLayers.length;
    if (type === 'online') {
      return this.filteredLayers.filter(l => l.type === 'Imagery').length;
    }
    return this.filteredLayers.filter(l => l.type !== 'Imagery').length;
  }

  onSearchChanged(): void {
    this.page = 0;
    this.applyFilters();
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

  reset(): void {
    this.layerSearch = '';
    this.page = 0;
    this.typeFilter = 'all';
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
      width: '80%',
      data: { layer: {} }
    });

    dialogRef.afterClosed().subscribe((newLayer: Layer | undefined) => {
      if (!newLayer?.id) return;


      this.toastService.show(
        'Layer Created',
        ['../layers', newLayer.id],
        'Go to Layer'
      );

      this.refreshLayers();
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateResponsiveLayout();
  }

  private updateResponsiveLayout(): void {
    this.numChars = Math.ceil(window.innerWidth / 8.5);
    this.toolTipWidth = `${window.innerWidth * 0.75}px`;
  }

  layerRoute(layer: Layer): any[] {
    return ['../layers', layer.id];
  }
}
