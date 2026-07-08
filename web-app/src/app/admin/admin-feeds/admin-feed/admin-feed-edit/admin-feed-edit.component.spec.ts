import { JsonSchemaFormModule } from '@ngageoint/vendor-ajsf-core';
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { BehaviorSubject, of } from 'rxjs'
import { AdminBreadcrumbModule } from '../../../../../app/admin/admin-breadcrumb/admin-breadcrumb.module';
import { MageCommonModule } from '@ngageoint/mage.web-core-lib/common'
import { FeedItemSummaryComponent } from '../../../../../app/feed/feed-item/feed-item-summary/feed-item-summary.component';
import { ServiceType, FeedService } from '@ngageoint/mage.web-core-lib/feed'
import { JsonSchemaWidgetAutocompleteComponent } from '../../../json-schema/json-schema-widget/json-schema-widget-autocomplete.component';
import { JsonSchemaModule } from '../../../json-schema/json-schema.module';
import { MomentModule } from '../../../../../app/moment/moment.module';
import { StaticIconModule } from '@ngageoint/mage.web-core-lib/static-icon'
import { AdminServiceEditComponent } from '../../admin-service/admin-service-edit/admin-service-edit.component';
import { AdminFeedEditConfigurationComponent } from './admin-feed-edit-configuration.component';
import { AdminFeedEditItemPropertiesComponent } from './admin-feed-edit-item-properties/admin-feed-edit-item-properties.component';
import { AdminFeedEditTopicConfigurationComponent } from './admin-feed-edit-topic/admin-feed-edit-topic-configuration.component';
import { AdminFeedEditTopicComponent } from './admin-feed-edit-topic/admin-feed-edit-topic.component';
import { AdminFeedEditComponent } from './admin-feed-edit.component';
import { FeedEditState, freshEditState } from './feed-edit.model'
import { FeedEditService } from './feed-edit.service'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

type MockFeedEditService = {
  state$: BehaviorSubject<FeedEditState>
  newFeed: jasmine.Spy
  editFeed: jasmine.Spy
  serviceCreated: jasmine.Spy
  selectService: jasmine.Spy
  selectTopic: jasmine.Spy
  fetchParametersChanged: jasmine.Spy
  itemPropertiesSchemaChanged: jasmine.Spy
  feedMetaDataChanged: jasmine.Spy
  saveFeed: jasmine.Spy
  readonly currentState: FeedEditState
}

describe('FeedEditComponent', () => {

  let component: AdminFeedEditComponent;
  let fixture: ComponentFixture<AdminFeedEditComponent>
  let mockEditService: MockFeedEditService
  let mockFeedService: jasmine.SpyObj<FeedService>
  let routerSpy: jasmine.SpyObj<Router>

  const serviceTypes: ServiceType[] = [
    {
      pluginServiceTypeId: 'test:plugin1:type1',
      id: 'type1',
      title: 'Type 1',
      summary: 'Type 1 for testing',
      configSchema: {
        properties: {
          url: { type: 'string' }
        }
      }
    }
  ]

  beforeEach(waitForAsync(() => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate'])

    mockEditService = {
      state$: new BehaviorSubject<FeedEditState>(freshEditState()),
      newFeed: jasmine.createSpy('newFeed'),
      editFeed: jasmine.createSpy('editFeed'),
      serviceCreated: jasmine.createSpy('serviceCreated'),
      selectService: jasmine.createSpy('selectService'),
      selectTopic: jasmine.createSpy('selectTopic'),
      fetchParametersChanged: jasmine.createSpy('fetchParametersChanged'),
      itemPropertiesSchemaChanged: jasmine.createSpy('itemPropertiesSchemaChanged'),
      feedMetaDataChanged: jasmine.createSpy('feedMetaDataChanged'),
      saveFeed: jasmine.createSpy('saveFeed').and.returnValue(of({ id: 'feed-1' })),
      get currentState() {
        return this.state$.value
      }
    }

    mockFeedService = jasmine.createSpyObj<FeedService>('MockFeedService', [
      'fetchServiceTypes',
      'fetchServices',
      'createService'
    ])

    mockFeedService.fetchServiceTypes.and.returnValue(of(serviceTypes))
    mockFeedService.fetchServices.and.returnValue(of([]))

    TestBed.configureTestingModule({
    declarations: [
        AdminFeedEditComponent,
        AdminServiceEditComponent,
        AdminFeedEditTopicComponent,
        AdminFeedEditTopicConfigurationComponent,
        AdminFeedEditConfigurationComponent,
        AdminFeedEditItemPropertiesComponent,
        FeedItemSummaryComponent,
        JsonSchemaWidgetAutocompleteComponent
    ],
    imports: [MatAutocompleteModule,
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
        JsonSchemaModule,
        NoopAnimationsModule,
        MomentModule,
        MageCommonModule,
        StaticIconModule,
        AdminBreadcrumbModule],
    providers: [
        { provide: FeedService, useValue: mockFeedService },
        {
            provide: ActivatedRoute,
            useValue: {
                snapshot: {
                    paramMap: convertToParamMap({})
                }
            }
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
    ]
})
      .overrideComponent(AdminFeedEditComponent, {
        set: {
          providers: [{ provide: FeedEditService, useValue: mockEditService }]
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
    fixture.debugElement.nativeElement.remove()
  })

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
