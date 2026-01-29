import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { LayerDashboardComponent } from './layer-dashboard.component';
import { LayersService, Layer } from '../layers.service';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminToastService } from '../../services/admin-toast.service';

describe('LayerDashboardComponent', () => {
  let component: LayerDashboardComponent;
  let fixture: ComponentFixture<LayerDashboardComponent>;
  let mockLayersService: jasmine.SpyObj<LayersService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockUserService: { getMyself: jasmine.Spy };
  let router: Router;
  let toastSpy: jasmine.SpyObj<AdminToastService>;

  const mockLayers: Layer[] = [
    {
      id: 1,
      name: 'Test Imagery Layer',
      description: 'Test imagery description',
      type: 'Imagery',
      url: 'http://example.com/imagery',
      state: 'available'
    },
    {
      id: 2,
      name: 'Test Feature Layer',
      description: 'Test feature description',
      type: 'Feature',
      url: 'http://example.com/feature',
      state: 'available'
    },
    {
      id: 3,
      name: 'Test GeoPackage Layer',
      description: 'Test geopackage description',
      type: 'GeoPackage',
      state: 'available'
    }
  ];

  beforeEach(async () => {
    mockLayersService = jasmine.createSpyObj('LayersService', [
      'getLayers',
      'deleteLayer'
    ]);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    toastSpy = jasmine.createSpyObj('AdminToastService', ['show']);

    mockUserService = {
      getMyself: jasmine.createSpy('getMyself')
    };

    mockLayersService.getLayers.and.returnValue(of(mockLayers));
    mockUserService.getMyself.and.returnValue(
      of({
        role: { permissions: ['CREATE_LAYER', 'UPDATE_LAYER', 'DELETE_LAYER'] }
      })
    );

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [LayerDashboardComponent],
      providers: [
        { provide: LayersService, useValue: mockLayersService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: AdminUserService, useValue: mockUserService },
        { provide: AdminToastService, useValue: toastSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LayerDashboardComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize permissions and load layers', () => {
      fixture.detectChanges();

      expect(component.hasLayerCreatePermission).toBe(true);
      expect(component.hasLayerEditPermission).toBe(true);
      expect(component.hasLayerDeletePermission).toBe(true);
      expect(mockLayersService.getLayers).toHaveBeenCalledWith({
        includeUnavailable: true
      });
      expect(component.layers.length).toBe(3);
      expect(component.filteredLayers.length).toBe(3);
    });

    it('should set permissions to false when user has no permissions', () => {
      mockUserService.getMyself.and.returnValue(
        of({
          role: { permissions: [] }
        })
      );

      fixture.detectChanges();

      expect(component.hasLayerCreatePermission).toBe(false);
      expect(component.hasLayerEditPermission).toBe(false);
      expect(component.hasLayerDeletePermission).toBe(false);
    });

    it('should handle missing user permissions gracefully', () => {
      mockUserService.getMyself.and.returnValue(of(null));

      fixture.detectChanges();

      expect(component.hasLayerCreatePermission).toBe(false);
      expect(component.hasLayerEditPermission).toBe(false);
      expect(component.hasLayerDeletePermission).toBe(false);
    });

    it('should set permissions to false when getMyself errors', () => {
      mockUserService.getMyself.and.returnValue(
        throwError(() => new Error('nope'))
      );

      fixture.detectChanges();

      expect(component.hasLayerCreatePermission).toBe(false);
      expect(component.hasLayerEditPermission).toBe(false);
      expect(component.hasLayerDeletePermission).toBe(false);
    });
  });

  describe('refreshLayers', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should fetch and update layers', () => {
      const newLayers: Layer[] = [
        {
          id: 4,
          name: 'New Layer',
          type: 'Imagery',
          state: 'available'
        } as Layer
      ];
      mockLayersService.getLayers.and.returnValue(of(newLayers));

      component.refreshLayers();

      expect(mockLayersService.getLayers).toHaveBeenCalled();
      expect(component.layers).toEqual(newLayers);
      expect(component.filteredLayers).toEqual(newLayers);
    });

    it('should handle error when fetching layers', () => {
      spyOn(console, 'error');
      mockLayersService.getLayers.and.returnValue(
        throwError(() => new Error('Fetch error'))
      );

      component.refreshLayers();

      expect(console.error).toHaveBeenCalledWith(
        'Error fetching layers:',
        jasmine.any(Error)
      );
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should filter layers by search term in name', () => {
      component.layerSearch = 'imagery';
      component.onSearchChanged();

      expect(component.filteredLayers.length).toBe(1);
      expect(component.filteredLayers[0].name).toBe('Test Imagery Layer');
      expect(component.page).toBe(0);
    });

    it('should filter layers by search term in description', () => {
      component.layerSearch = 'feature description';
      component.onSearchChanged();

      expect(component.filteredLayers.length).toBe(1);
      expect(component.filteredLayers[0].type).toBe('Feature');
    });

    it('should filter layers by search term in URL', () => {
      component.layerSearch = 'example.com/imagery';
      component.onSearchChanged();

      expect(component.filteredLayers.length).toBe(1);
      expect(component.filteredLayers[0].id).toBe(1);
    });

    it('should be case-insensitive when searching', () => {
      component.layerSearch = 'IMAGERY';
      component.onSearchChanged();

      expect(component.filteredLayers.length).toBe(1);
    });

    it('should return all layers when search is empty', () => {
      component.layerSearch = '';
      component.onSearchChanged();

      expect(component.filteredLayers.length).toBe(3);
    });

    it('should filter by type - online (Imagery)', () => {
      component.onTypeFilterChange('online');

      expect(component.filteredLayers.length).toBe(1);
      expect(component.filteredLayers[0].type).toBe('Imagery');
    });

    it('should filter by type - offline (non-Imagery)', () => {
      component.onTypeFilterChange('offline');

      expect(component.filteredLayers.length).toBe(2);
      expect(component.filteredLayers.every((l) => l.type !== 'Imagery')).toBe(
        true
      );
    });

    it('should show all layers when filter is "all"', () => {
      component.onTypeFilterChange('all');

      expect(component.filteredLayers.length).toBe(3);
    });

    it('should combine search and type filters', () => {
      component.layerSearch = 'test';
      component.onTypeFilterChange('online');

      expect(component.filteredLayers.length).toBe(1);
      expect(component.filteredLayers[0].type).toBe('Imagery');
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should get paginated layers correctly', () => {
      component.page = 0;
      component.itemsPerPage = 2;

      const paginated = component.getPaginatedLayers();

      expect(paginated.length).toBe(2);
      expect(paginated[0].id).toBe(1);
      expect(paginated[1].id).toBe(2);
    });

    it('should get second page of layers', () => {
      component.page = 1;
      component.itemsPerPage = 2;

      const paginated = component.getPaginatedLayers();

      expect(paginated.length).toBe(1);
      expect(paginated[0].id).toBe(3);
    });

    it('should handle page change event', () => {
      const event: PageEvent = {
        pageIndex: 1,
        pageSize: 5,
        length: 10
      };

      component.onPageChange(event);

      expect(component.page).toBe(1);
      expect(component.itemsPerPage).toBe(5);
    });

    it('should update total layers count', () => {
      fixture.detectChanges();
      expect(component.totalLayers).toBe(3);

      component.layerSearch = 'imagery';
      component.onSearchChanged();

      expect(component.totalLayers).toBe(1);
    });
  });

  describe('type counts', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return correct count for all layers', () => {
      expect(component.getTypeCount('all')).toBe(3);
    });

    it('should return correct count for online layers', () => {
      expect(component.getTypeCount('online')).toBe(1);
    });

    it('should return correct count for offline layers', () => {
      expect(component.getTypeCount('offline')).toBe(2);
    });
  });

  describe('search handlers', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle search term changed from card navbar', () => {
      component.page = 1;
      component.onSearchTermChanged('new search');

      expect(component.layerSearch).toBe('new search');
      expect(component.page).toBe(0);
    });

    it('should handle search cleared', () => {
      component.layerSearch = 'some search';
      component.page = 2;
      component.onSearchCleared();

      expect(component.layerSearch).toBe('');
      expect(component.page).toBe(0);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should reset all filters and pagination', () => {
      component.layerSearch = 'search term';
      component.page = 2;
      component.typeFilter = 'online';

      component.reset();

      expect(component.layerSearch).toBe('');
      expect(component.page).toBe(0);
      expect(component.typeFilter).toBe('all');
      expect(component.filteredLayers.length).toBe(3);
    });
  });

  describe('layer creation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should open create layer dialog', () => {
      const mockDialogRef = {
        afterClosed: () => of(null)
      };
      mockDialog.open.and.returnValue(mockDialogRef as any);

      component.newLayer();

      expect(mockDialog.open).toHaveBeenCalled();
    });

    it('should refresh and toast after creating layer', () => {
      const newLayer: Layer = {
        id: 5,
        name: 'New Layer',
        type: 'Imagery',
        state: 'available'
      } as Layer;
      const mockDialogRef = {
        afterClosed: () => of(newLayer)
      };
      mockDialog.open.and.returnValue(mockDialogRef as any);
      spyOn(component, 'refreshLayers');

      component.newLayer();

      expect(toastSpy.show).toHaveBeenCalled();
      expect(component.refreshLayers).toHaveBeenCalled();
    });

    it('should not toast if dialog is cancelled', () => {
      const mockDialogRef = {
        afterClosed: () => of(null)
      };
      mockDialog.open.and.returnValue(mockDialogRef as any);
      spyOn(component, 'refreshLayers');

      component.newLayer();

      expect(toastSpy.show).not.toHaveBeenCalled();
      expect(component.refreshLayers).not.toHaveBeenCalled();
    });

    it('should not toast if dialog returns a layer without id', () => {
      const mockDialogRef = {
        afterClosed: () =>
          of({ name: 'No Id', type: 'Imagery', state: 'available' } as Layer)
      };
      mockDialog.open.and.returnValue(mockDialogRef as any);
      spyOn(component, 'refreshLayers');

      component.newLayer();

      expect(toastSpy.show).not.toHaveBeenCalled();
      expect(component.refreshLayers).not.toHaveBeenCalled();
    });
  });

  describe('responsive layout', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update layout values on window resize', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1000
      });

      component.onResize();

      expect(component.numChars).toBe(Math.ceil(1000 / 8.5));
      expect(component.toolTipWidth).toBe('750px');
    });

    it('should set initial responsive values', () => {
      expect(component.numChars).toBeGreaterThan(0);
      expect(component.toolTipWidth).toContain('px');
    });
  });

  describe('breadcrumbs', () => {
    it('should have correct breadcrumb configuration', () => {
      expect(component.breadcrumbs.length).toBe(1);
      expect(component.breadcrumbs[0].title).toBe('Layers');
      expect(component.breadcrumbs[0].iconClass).toBe('fa fa-map');
    });
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      expect(component.layers).toEqual([]);
      expect(component.filteredLayers).toEqual([]);
      expect(component.layerSearch).toBe('');
      expect(component.page).toBe(0);
      expect(component.itemsPerPage).toBe(10);
      expect(component.typeFilter).toBe('all');
      expect(component.displayedColumns).toEqual(['layer']);
      expect(component.pageSizeOptions).toEqual([5, 10, 25, 50]);
    });
  });
});
