import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StateService } from '@uirouter/angular';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { BehaviorSubject, of } from 'rxjs';
import { FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { FeedEditService } from './feed-edit.service';
import { AdminFeedEditComponent } from './admin-feed-edit.component';
import { AdminServiceEditComponent } from '../../admin-service/admin-service-edit/admin-service-edit.component';
import { AdminFeedEditConfigurationComponent } from './admin-feed-edit-configuration.component';
import { AdminFeedEditItemPropertiesComponent } from './admin-feed-edit-item-properties/admin-feed-edit-item-properties.component';
import { AdminFeedEditTopicConfigurationComponent } from './admin-feed-edit-topic/admin-feed-edit-topic-configuration.component';
import { AdminFeedEditTopicComponent } from './admin-feed-edit-topic/admin-feed-edit-topic.component';
import { FeedItemSummaryComponent } from '../../../../../app/feed/feed-item/feed-item-summary/feed-item-summary.component';
import { JsonSchemaWidgetAutocompleteComponent } from '../../../../../app/json-schema/json-schema-widget/json-schema-widget-autocomplete.component';
import { JsonSchemaFormModule } from '@ajsf/core';
import { FeedEditState, freshEditState } from './feed-edit.model';

class MockStateService {
  get params(): any {
    return {};
  }
}

type MockFeedEditService = Partial<jasmine.SpyObj<FeedEditService>> & {
  state$: BehaviorSubject<FeedEditState>
};

describe('AdminFeedEditComponent', () => {
  let component: AdminFeedEditComponent;
  let fixture: ComponentFixture<AdminFeedEditComponent>;
  let mockEditService: MockFeedEditService;
  let mockFeedService: jasmine.SpyObj<FeedService>;

  beforeEach(waitForAsync(() => {
    mockEditService = {
      state$: new BehaviorSubject<FeedEditState>(freshEditState()),
      newFeed: jasmine.createSpy<FeedEditService['newFeed']>(),
      editFeed: jasmine.createSpy<FeedEditService['editFeed']>(),
      deleteFeed: jasmine.createSpy<FeedEditService['deleteFeed']>(),  // Add mock for deleteFeed
      get currentState() {
        return this.state$.value;
      }
    };
    mockFeedService = jasmine.createSpyObj<FeedService>('MockFeedService', [
      'fetchServiceTypes',
      'fetchServices',
      'createService'
    ]);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: StateService,
          useClass: MockStateService
        },
        {
          provide: FeedService,
          useValue: mockFeedService
        }
      ],
      imports: [
        MatAutocompleteModule,
        MatDividerModule,
        MatExpansionModule,
        MatListModule,
        MatFormFieldModule,
        MatCheckboxModule,
        MatInputModule,
        MatSelectModule,
        MatCardModule,
        MatIconModule,
        NgxMatSelectSearchModule,
        FormsModule,
        ReactiveFormsModule,
        JsonSchemaFormModule,
        NoopAnimationsModule
      ],
      declarations: [
        AdminFeedEditComponent,
        AdminServiceEditComponent,
        AdminFeedEditTopicComponent,
        AdminFeedEditTopicConfigurationComponent,
        AdminFeedEditConfigurationComponent,
        AdminFeedEditItemPropertiesComponent,
        FeedItemSummaryComponent,
        JsonSchemaWidgetAutocompleteComponent
      ]
    })
      .overrideComponent(AdminFeedEditComponent, {
        set: {
          providers: [
            { provide: FeedEditService, useValue: mockEditService }
          ]
        }
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminFeedEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.debugElement.nativeElement.remove();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call deleteFeed when deleteFeed method is called', () => {
    const feedId = '123';
  
    // Mock feed expanded with service and topic
    const mockFeed: FeedExpanded = {
      id: feedId,
      title: 'Test Feed',
      service: { id: 'service-id', title: 'Test Service' } as Service, // Mock service
      topic: { id: 'topic-id', title: 'Test Topic' } as FeedTopic,     // Mock topic
      constantParams: null,  // Add any other necessary fields here
      itemPropertiesSchema: null, // Add any other necessary fields here
      feedMetaData: null, // Add any other necessary fields here
      preview: null // Add any necessary fields here
    };
  
    // Set up initial state with mock feed
    mockEditService.state$.next({
      ...freshEditState(),
      originalFeed: mockFeed
    });
  
    component.deleteFeed(); // Trigger deleteFeed
  
    expect(mockEditService.deleteFeed).toHaveBeenCalledWith(feedId);
    expect(mockFeedService.deleteFeed).toHaveBeenCalledWith(feedId);  // Check if service delete/called
  });
  

  it('should redirect to feed list after feed is deleted', () => {
    const feedId = '123';
  
    // Mock feed expanded with service and topic
    const mockFeed: FeedExpanded = {
      id: feedId,
      title: 'Test Feed',
      service: { id: 'service-id', title: 'Test Service' } as Service,  // Mock service
      topic: { id: 'topic-id', title: 'Test Topic' } as FeedTopic,      // Mock topic
      constantParams: null,  // Add any other necessary fields here
      itemPropertiesSchema: null, // Add any other necessary fields here
      feedMetaData: null, // Add any other necessary fields here
      preview: null // Add other necessary fields here
    };
  
    // Set up initial state with mock feed
    mockEditService.state$.next({
      ...freshEditState(),
      originalFeed: mockFeed
    });
  
    spyOn(component['stateService'], 'go'); // Spy on the stateService's 'go' method
  
    // Simulate deletion and redirect
    component.deleteFeed();
  
    expect(mockEditService.deleteFeed).toHaveBeenCalledWith(feedId);  // Ensure deleteFeed was called with the correct feedId
    expect(component['stateService'].go).toHaveBeenCalledWith('admin.feeds');  // Check if redirect happened
  });
  
});
