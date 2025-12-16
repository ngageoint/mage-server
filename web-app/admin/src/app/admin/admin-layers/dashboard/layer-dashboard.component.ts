import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { StateService } from '@uirouter/angular';
import { UserService } from 'admin/src/app/upgrade/ajs-upgraded-providers';
import { LayersService, Layer } from '../layers.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { CreateLayerDialogComponent } from '../create-layer/create-layer.component';
import _ from 'underscore';

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
    private stateService: StateService,
    private layersService: LayersService,
    @Inject(UserService) private userService: any
  ) { }

  ngOnInit(): void {
    this.initPermissions();
    this.refreshLayers();
    this.updateResponsiveLayout();
  }

  /** Initialize permission flags */
  private initPermissions(): void {
    const permissions = this.userService.myself?.role?.permissions || [];
    this.hasLayerCreatePermission = _.contains(permissions, 'CREATE_LAYER');
    this.hasLayerEditPermission = _.contains(permissions, 'UPDATE_LAYER');
    this.hasLayerDeletePermission = _.contains(permissions, 'DELETE_LAYER');
  }

  /** Fetch and apply filters to the layer list */
  refreshLayers(): void {
    this.layersService.getLayers({ includeUnavailable: true }).subscribe({
      next: (layers) => {
        this.layers = layers;
        this.applyFilters();
      },
      error: (err) => console.error('Error fetching layers:', err)
    });
  }

  /** Apply search and type filters */
  private applyFilters(): void {
    if (!this.layers) return;

    const term = this.layerSearch.trim().toLowerCase();

    this.filteredLayers = this.layers.filter(layer => {
      const matchesSearch = !term ||
        layer.name?.toLowerCase().includes(term) ||
        layer.description?.toLowerCase().includes(term) ||
        layer.url?.toLowerCase().includes(term);

      const matchesType = this.filterByType(layer);

      return matchesSearch && matchesType;
    });

    this.totalLayers = this.filteredLayers.length;
  }

  /** Filter layers by type */
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

  /** Get paginated layers for display */
  getPaginatedLayers(): Layer[] {
    const startIndex = this.page * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredLayers.slice(startIndex, endIndex);
  }

  /** Get count for specific type filter */
  getTypeCount(type: 'all' | 'online' | 'offline'): number {
    if (type === 'all') return this.filteredLayers.length;
    if (type === 'online') {
      return this.filteredLayers.filter(l => l.type === 'Imagery').length;
    }
    return this.filteredLayers.filter(l => l.type !== 'Imagery').length;
  }

  /** Handle search term change */
  onSearchChanged(): void {
    this.page = 0;
    this.applyFilters();
  }

  /** Handle search term change from card navbar */
  onSearchTermChanged(term: string): void {
    this.layerSearch = term;
    this.page = 0;
    this.applyFilters();
  }

  /** Handle search cleared from card navbar */
  onSearchCleared(): void {
    this.layerSearch = '';
    this.page = 0;
    this.applyFilters();
  }

  /** Reset all filters and pagination */
  reset(): void {
    this.layerSearch = '';
    this.page = 0;
    this.typeFilter = 'all';
    this.applyFilters();
  }

  /** Handle type filter change */
  onTypeFilterChange(type: 'all' | 'online' | 'offline'): void {
    this.typeFilter = type;
    this.page = 0;
    this.applyFilters();
  }

  /** Handle pagination change */
  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.itemsPerPage = event.pageSize;
  }

  /** Open create layer dialog */
  newLayer(): void {
    this.stateService.go('admin.layerCreate');
    // const dialogRef = this.modal.open(CreateLayerDialogComponent, {
    //   data: { layer: {} }
    // });

    // dialogRef.afterClosed().subscribe((newLayer) => {
    //   if (newLayer) {
    //     this.refreshLayers();
    //     this.stateService.go('admin.layer', { layerId: newLayer.id });
    //   }
    // });
  }

  /** Navigate to layer detail */
  gotoLayer(layer: Layer): void {
    this.stateService.go('admin.layer', { layerId: layer.id });
  }

  /** Update layout-related values on resize */
  @HostListener('window:resize')
  onResize(): void {
    this.updateResponsiveLayout();
  }

  /** Calculates responsive values */
  private updateResponsiveLayout(): void {
    this.numChars = Math.ceil(window.innerWidth / 8.5);
    this.toolTipWidth = `${window.innerWidth * 0.75}px`;
  }
}

