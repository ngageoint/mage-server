import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { AdminFeedEditComponent } from './admin-feed-edit.component';
import { FeedEditState, freshEditState } from './feed-edit.model';
import { FeedEditService } from './feed-edit.service';

type EverythingMock = {
  snapshot: {
    paramMap: ReturnType<typeof convertToParamMap>;
  };
  state$: BehaviorSubject<FeedEditState>;
  newFeed: jasmine.Spy;
  editFeed: jasmine.Spy;
  serviceCreated: jasmine.Spy;
  selectService: jasmine.Spy;
  selectTopic: jasmine.Spy;
  fetchParametersChanged: jasmine.Spy;
  itemPropertiesSchemaChanged: jasmine.Spy;
  feedMetaDataChanged: jasmine.Spy;
  saveFeed: jasmine.Spy;
  fetchServiceTypes: jasmine.Spy;
  fetchServices: jasmine.Spy;
  createService: jasmine.Spy;
  navigate: jasmine.Spy;
  readonly currentState: FeedEditState;
};

describe('FeedEditComponent', () => {
  let component: AdminFeedEditComponent;
  let mock: EverythingMock;

  beforeEach(() => {
    const state$ = new BehaviorSubject<FeedEditState>(freshEditState());

    mock = {
      snapshot: {
        paramMap: convertToParamMap({})
      },
      state$,
      newFeed: jasmine.createSpy('newFeed'),
      editFeed: jasmine.createSpy('editFeed'),
      serviceCreated: jasmine.createSpy('serviceCreated'),
      selectService: jasmine.createSpy('selectService'),
      selectTopic: jasmine.createSpy('selectTopic'),
      fetchParametersChanged: jasmine.createSpy('fetchParametersChanged'),
      itemPropertiesSchemaChanged: jasmine.createSpy(
        'itemPropertiesSchemaChanged'
      ),
      feedMetaDataChanged: jasmine.createSpy('feedMetaDataChanged'),
      saveFeed: jasmine.createSpy('saveFeed').and.returnValue(
        of({
          id: 'feed-1'
        })
      ),
      fetchServiceTypes: jasmine.createSpy('fetchServiceTypes').and.returnValue(
        of([
          {
            pluginServiceTypeId: 'test:plugin1:type1',
            id: 'type1',
            title: 'Type 1',
            summary: 'Type 1 for testing',
            configSchema: {
              properties: {
                url: {
                  type: 'string'
                }
              }
            }
          } as any
        ])
      ),
      fetchServices: jasmine.createSpy('fetchServices').and.returnValue(of([])),
      createService: jasmine.createSpy('createService').and.returnValue(
        of({
          id: 'service-1'
        } as any)
      ),
      navigate: jasmine.createSpy('navigate'),
      get currentState() {
        return this.state$.value;
      }
    };

    component = new (AdminFeedEditComponent as any)(
      mock as unknown as ActivatedRoute,
      mock as unknown as FeedEditService,
      mock as unknown as FeedService,
      mock as unknown as Router
    ) as AdminFeedEditComponent;
  });

  afterEach(() => {
    mock.state$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
