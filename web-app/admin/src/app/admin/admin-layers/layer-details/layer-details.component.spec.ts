import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StateService } from '@uirouter/angular';
import { LayerDetailsComponent } from './layer-details.component';
import { LayersService } from '../layers.service';
import { EventsService } from '../../admin-event/events.service';
import { LocalStorageService, UserService } from '../../../upgrade/ajs-upgraded-providers';
import { of } from 'rxjs';

describe('LayerDetailsComponent', () => {
  let component: LayerDetailsComponent;
  let fixture: ComponentFixture<LayerDetailsComponent>;

  const mockStateService = {
    params: { layerId: '1' },
    go: jasmine.createSpy('go')
  };

  const mockLocalStorageService = {
    getToken: () => 'test-token'
  };

  const mockUserService = {
    myself: {
      id: '123',
      role: {
        permissions: ['UPDATE_LAYER', 'DELETE_LAYER']
      }
    }
  };

  const mockLayersService = {
    getLayerById: jasmine.createSpy('getLayerById').and.returnValue(of({
      id: 1,
      name: 'Test Layer',
      type: 'Feature',
      state: 'available'
    })),
    deleteLayer: jasmine.createSpy('deleteLayer').and.returnValue(of({}))
  };

  const mockEventsService = {
    getEvents: jasmine.createSpy('getEvents').and.returnValue(of({
      items: []
    })),
    addLayerToEvent: jasmine.createSpy('addLayerToEvent').and.returnValue(of({})),
    removeLayerFromEvent: jasmine.createSpy('removeLayerFromEvent').and.returnValue(of({}))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LayerDetailsComponent],
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: StateService, useValue: mockStateService },
        { provide: LayersService, useValue: mockLayersService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: UserService, useValue: mockUserService }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LayerDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load layer on init', () => {
    expect(mockLayersService.getLayerById).toHaveBeenCalledWith('1');
    expect(component.layer).toBeDefined();
  });

  it('should set permissions based on user role', () => {
    expect(component.hasLayerEditPermission).toBe(true);
    expect(component.hasLayerDeletePermission).toBe(true);
  });
});
