import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync,
  discardPeriodicTasks
} from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule as MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule as MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import * as _ from 'lodash';
import { StaticIconModule } from '@ngageoint/mage.web-core-lib/static-icon';
import { FeedIconModule } from '@ngageoint/mage.web-core-lib/feed/feed-icon';
import { FeedTopic } from '@ngageoint/mage.web-core-lib/feed';
import {
  AdminFeedEditConfigurationComponent,
  formValueForMetaData
} from './admin-feed-edit-configuration.component';
import {
  FeedMetaData,
  feedMetaDataLean,
  FeedMetaDataNullable
} from './feed-edit.model';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

type FeedMetaDataBooleanKeys = 'itemsHaveIdentity' | 'itemsHaveSpatialDimension';

const emptyMetaDataFormValue: FeedMetaDataNullable = {
  title: null,
  summary: null,
  icon: null,
  itemPrimaryProperty: null,
  itemSecondaryProperty: null,
  itemTemporalProperty: null,
  itemsHaveIdentity: null,
  itemsHaveSpatialDimension: null,
  updateFrequencySeconds: null,
  mapStyle: { icon: null }
};

describe('FeedMetaDataComponent', () => {
  let debounceTimeMs: number;

  @Component({
    selector: 'test-feed-meta-data-host',
    template: `
      <app-feed-configuration
        #target
        [topic]="topic"
        [feedMetaData]="feedMetaData"
        [buttonText]="acceptButtonText"
      ></app-feed-configuration>
    `,
    standalone: false
})
  class TestFeedMetaDataHostComponent {
    topic: FeedTopic | null = null;
    feedMetaData: FeedMetaData | null = null;
    acceptButtonText: string = 'Test Accept';
  }

  let host: TestFeedMetaDataHostComponent;
  let target: AdminFeedEditConfigurationComponent;
  let fixture: ComponentFixture<TestFeedMetaDataHostComponent>;
  let formChanges: FeedMetaDataNullable[];
  let metaDataChanges: FeedMetaData[];

  function setUserValue<K extends keyof FeedMetaDataNullable>(
    key: K,
    value: FeedMetaDataNullable[K]
  ): void {
    const control = target.feedMetaDataForm.get(key as string);
    control.setValue(value);
    control.markAsDirty();
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        TestFeedMetaDataHostComponent,
        AdminFeedEditConfigurationComponent
    ],
    imports: [FormsModule,
        MatAutocompleteModule,
        MatCheckboxModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
        StaticIconModule,
        FeedIconModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestFeedMetaDataHostComponent);
    host = fixture.componentInstance;

    target = fixture.debugElement.query(
      By.directive(AdminFeedEditConfigurationComponent)
    ).references['target'];

    fixture.detectChanges();

    debounceTimeMs = target.changeDebounceInterval;
    formChanges = [];
    metaDataChanges = [];

    target.feedMetaDataForm.valueChanges.subscribe((formValue) => {
      formChanges.push(formValue);
    });

    target.feedMetaDataChanged.subscribe((metaData) => {
      metaDataChanges.push(metaData);
    });
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
    try {
      discardPeriodicTasks();
    } catch {
    }
  });

  it('should create', () => {
    expect(target).toBeTruthy();
  });

  describe('mapping meta-data to form value', () => {
    it('maps absent keys to null form values', () => {
      expect(formValueForMetaData({ mapStyle: { icon: null } })).toEqual(emptyMetaDataFormValue);
    });

    it('maps undefined keys to null form values', () => {
      const undefinedKeys: Record<keyof FeedMetaDataNullable, undefined> = {
        title: undefined,
        summary: undefined,
        icon: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined
      };

      expect(formValueForMetaData({ ...undefinedKeys, mapStyle: { icon: null } })).toEqual(emptyMetaDataFormValue);
    });

    it('maps defined values directly', () => {
      const metaData: Required<FeedMetaData> = {
        title: 'Topic 1',
        summary: 'Testing topic 1',
        icon: { sourceUrl: 'test://icon1.png' },
        itemPrimaryProperty: 'prop1',
        itemSecondaryProperty: 'prop2',
        itemTemporalProperty: 'prop3',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        updateFrequencySeconds: 60,
        mapStyle: { icon: { sourceUrl: 'test://icon1.png' } }
      };

      expect(formValueForMetaData(metaData)).toEqual(metaData);
    });

    it('maps a partial meta-data', () => {
      const metaData: FeedMetaData = {
        title: 'Topic 1',
        summary: undefined,
        icon: { sourceUrl: 'test://icon1.png' },
        itemPrimaryProperty: 'prop1',
        itemTemporalProperty: 'prop3',
        itemsHaveIdentity: false,
        mapStyle: { icon: null }
      };

      expect(formValueForMetaData(metaData)).toEqual({
        ...emptyMetaDataFormValue,
        ...metaData,
        summary: null
      });
    });
  });

  it('emits a debounced event when the form value changes from input', fakeAsync(() => {
    setUserValue('title', 'Test');
    fixture.detectChanges();
    tick(debounceTimeMs / 2);

    expect(formChanges).toEqual([
      {
        ...emptyMetaDataFormValue,
        title: 'Test'
      }
    ]);
    expect(metaDataChanges).toEqual([]);

    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(formChanges).toEqual([
      {
        ...emptyMetaDataFormValue,
        title: 'Test'
      }
    ]);
    expect(metaDataChanges).toEqual([
      {
        title: 'Test',
        mapStyle: { icon: null }
      }
    ]);

    discardPeriodicTasks();
  }));

  it('emits changed meta-data building on previous meta-data with changed form values', fakeAsync(() => {
    const topic: FeedTopic = {
      id: 'topic1',
      title: 'Topic 1',
      summary: 'Topic 1 summary'
    };
    const initFeedMetaData: FeedMetaData = {
      ...feedMetaDataLean(topic),
      title: 'Feed 1',
      itemPrimaryProperty: 'neverChanged',
      itemTemporalProperty: 'removed',
      icon: { id: 'icon123' },
      mapStyle: { icon: null }
    };

    host.topic = topic;
    host.feedMetaData = initFeedMetaData;
    fixture.detectChanges();

    setUserValue('title', 'Feed 1 Mod');
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.feedMetaData).toEqual({
      ...initFeedMetaData,
      title: 'Feed 1 Mod'
    });
    expect(metaDataChanges).toEqual([
      {
        ...initFeedMetaData,
        title: 'Feed 1 Mod'
      }
    ]);

    setUserValue('itemSecondaryProperty', 'addedSecondary');
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.feedMetaData).toEqual({
      ...initFeedMetaData,
      title: 'Feed 1 Mod',
      itemSecondaryProperty: 'addedSecondary'
    });
    expect(metaDataChanges).toEqual([
      {
        ...initFeedMetaData,
        title: 'Feed 1 Mod'
      },
      {
        ...initFeedMetaData,
        title: 'Feed 1 Mod',
        itemSecondaryProperty: 'addedSecondary'
      }
    ]);

    setUserValue('itemTemporalProperty', '');
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.feedMetaData).toEqual({
      ..._.omit(initFeedMetaData, 'itemTemporalProperty'),
      title: 'Feed 1 Mod',
      itemPrimaryProperty: initFeedMetaData.itemPrimaryProperty,
      itemSecondaryProperty: 'addedSecondary'
    });
    expect(metaDataChanges).toEqual([
      {
        ...initFeedMetaData,
        title: 'Feed 1 Mod'
      },
      {
        ...initFeedMetaData,
        title: 'Feed 1 Mod',
        itemSecondaryProperty: 'addedSecondary'
      },
      {
        ..._.omit(initFeedMetaData, 'itemTemporalProperty'),
        title: 'Feed 1 Mod',
        itemPrimaryProperty: initFeedMetaData.itemPrimaryProperty,
        itemSecondaryProperty: 'addedSecondary'
      }
    ]);

    discardPeriodicTasks();
  }));

  it('does not include values for changed controls when value is empty', fakeAsync(() => {
    const topic: FeedTopic = {
      id: 'topic1',
      title: 'Topic 1'
    };
    const feedMetaData: FeedMetaData = {
      title: 'Feed 1'
    };
    host.topic = topic;
    host.feedMetaData = feedMetaData;
    fixture.detectChanges();

    expect(target.feedMetaDataForm.value).toEqual({
      ...emptyMetaDataFormValue,
      title: 'Feed 1'
    });
    expect(target.feedMetaDataForm.dirty).toEqual(false);

    setUserValue('title', '');
    setUserValue('summary', 'Feed summary');

    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(formChanges).toEqual([
      {
        ...emptyMetaDataFormValue,
        title: '',
        mapStyle: { icon: null }
      },
      {
        ...emptyMetaDataFormValue,
        title: '',
        summary: 'Feed summary',
        mapStyle: { icon: null }
      }
    ]);
    expect(metaDataChanges).toEqual([{ summary: 'Feed summary', mapStyle: { icon: null } }]);
    expect(target.feedMetaData).toEqual({ summary: 'Feed summary', mapStyle: { icon: null } });

    discardPeriodicTasks();
  }));

  it('populates form from topic without emitting change event', () => {
    const topicMetaData: Required<FeedMetaData> = {
      title: 'Topic 1',
      summary: 'Testing topic 1',
      icon: { sourceUrl: 'test://icon1.png' },
      itemPrimaryProperty: 'prop1',
      itemSecondaryProperty: 'prop2',
      itemTemporalProperty: 'prop3',
      itemsHaveIdentity: true,
      itemsHaveSpatialDimension: true,
      updateFrequencySeconds: 60,
      mapStyle: { icon: { sourceUrl: 'test://icon1.png' } }
    };
    const topic: FeedTopic = {
      id: 'topic1',
      ...topicMetaData,
      icon: { sourceUrl: 'test://icon1.png' }
    };
    host.topic = topic;
    fixture.detectChanges();

    expect(target.feedMetaDataForm.value).toEqual(topicMetaData);
    expect(formChanges).toEqual([]);
    expect(metaDataChanges).toEqual([]);
  });

  it('updates the form when the feed meta-data changes without emitting change event', fakeAsync(() => {
    const feedMetaData: Required<FeedMetaData> = Object.freeze({
      title: 'Test',
      summary: 'Test summary',
      icon: { id: 'icon1' },
      itemPrimaryProperty: 'prop1',
      itemSecondaryProperty: 'prop2',
      itemTemporalProperty: 'prop3',
      updateFrequencySeconds: 90,
      itemsHaveIdentity: false,
      itemsHaveSpatialDimension: false,
      mapStyle: { icon: { id: 'icon2' }}
    });
    const feedMetaDataMod: Required<FeedMetaData> = Object.freeze({
      title: 'Test Mod',
      summary: 'Test summary mod',
      icon: { id: 'icon2' },
      itemPrimaryProperty: 'prop3',
      itemSecondaryProperty: 'prop1',
      itemTemporalProperty: 'prop2',
      updateFrequencySeconds: 900,
      itemsHaveIdentity: true,
      itemsHaveSpatialDimension: true,
      mapStyle: { icon: { id: 'icon3' } }
    });
    host.topic = { id: 'topic1', title: 'Topic 1' };
    host.feedMetaData = feedMetaData;
    fixture.detectChanges();

    expect(target.feedMetaDataForm.value).toEqual(formValueForMetaData(feedMetaData));
    expect(target.feedMetaData).toEqual(feedMetaData);

    host.feedMetaData = feedMetaDataMod;
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.feedMetaDataForm.value).toEqual(formValueForMetaData(feedMetaDataMod));
    expect(target.feedMetaData).toEqual(feedMetaDataMod);
    expect(formChanges).toEqual([]);
    expect(metaDataChanges).toEqual([]);

    discardPeriodicTasks();
  }));

  it('populates form from feed meta-data merged with topic meta-data without emitting change preferring feed meta-data values', fakeAsync(() => {
    const topic: FeedTopic = Object.freeze({
      id: 'topic1',
      title: 'Topic Title',
      itemsHaveIdentity: true,
      itemsHaveSpatialDimension: false,
      itemPrimaryProperty: 'prop1',
      updateFrequencySeconds: 3000,
      mapStyle: { icon: null }
    });
    const feedMetaData: FeedMetaData = Object.freeze({
      title: 'Feed Title',
      summary: 'Feed summary',
      itemsHaveSpatialDimension: true,
      itemSecondaryProperty: 'prop2',
      icon: { id: 'feedicon1' },
      updateFrequencySeconds: 0,
      mapStyle: { icon: null }
    });

    host.topic = topic;
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.topic).toEqual(topic);
    expect(target.feedMetaDataForm.value).toEqual(formValueForMetaData(topic));

    host.feedMetaData = feedMetaData;
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.feedMetaDataForm.value).toEqual(
      formValueForMetaData({
        title: feedMetaData.title,
        summary: feedMetaData.summary,
        icon: feedMetaData.icon,
        itemsHaveIdentity: topic.itemsHaveIdentity,
        itemsHaveSpatialDimension: feedMetaData.itemsHaveSpatialDimension,
        itemPrimaryProperty: topic.itemPrimaryProperty,
        itemSecondaryProperty: feedMetaData.itemSecondaryProperty,
        updateFrequencySeconds: feedMetaData.updateFrequencySeconds,
        mapStyle: feedMetaData.mapStyle
      })
    );
    expect(formChanges).toEqual([]);
    expect(metaDataChanges).toEqual([]);

    discardPeriodicTasks();
  }));

  it('does not populate form fields from topic or previous meta-data after user clears form values', fakeAsync(() => {
    const topic: FeedTopic = Object.freeze({
      id: 'topic1',
      title: 'Topic Title',
      itemsHaveIdentity: true,
      itemsHaveSpatialDimension: false,
      itemPrimaryProperty: 'prop1',
      itemSecondaryProperty: 'prop2Topic',
      updateFrequencySeconds: 3000,
      mapStyle: { icon: null }
    });
    const feedMetaData: FeedMetaData = Object.freeze({
      title: 'Feed Title',
      summary: 'Feed summary',
      itemsHaveSpatialDimension: true,
      itemSecondaryProperty: 'prop2',
      icon: { id: 'feedicon1' },
      updateFrequencySeconds: 0,
      mapStyle: { icon: null }
    });

    host.topic = topic;
    host.feedMetaData = feedMetaData;
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.topic).toEqual(topic);
    expect(target.feedMetaData).toEqual(feedMetaData);
    expect(target.feedMetaDataForm.value).toEqual(
      formValueForMetaData({
        title: feedMetaData.title,
        summary: feedMetaData.summary,
        icon: feedMetaData.icon,
        itemsHaveIdentity: topic.itemsHaveIdentity,
        itemsHaveSpatialDimension: feedMetaData.itemsHaveSpatialDimension,
        itemPrimaryProperty: topic.itemPrimaryProperty,
        itemSecondaryProperty: feedMetaData.itemSecondaryProperty,
        updateFrequencySeconds: feedMetaData.updateFrequencySeconds,
        mapStyle: feedMetaData.mapStyle
      })
    );
    expect(formChanges).toEqual([]);
    expect(metaDataChanges).toEqual([]);

    setUserValue('itemSecondaryProperty', '');
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    host.feedMetaData = target.feedMetaData;
    fixture.detectChanges();

    expect(target.feedMetaDataForm.value).toEqual(
      formValueForMetaData({
        title: feedMetaData.title,
        summary: feedMetaData.summary,
        icon: feedMetaData.icon,
        itemsHaveIdentity: topic.itemsHaveIdentity,
        itemsHaveSpatialDimension: feedMetaData.itemsHaveSpatialDimension,
        itemPrimaryProperty: topic.itemPrimaryProperty,
        itemSecondaryProperty: null,
        updateFrequencySeconds: feedMetaData.updateFrequencySeconds,
        mapStyle: feedMetaData.mapStyle
      })
    );
    expect(target.feedMetaData).toEqual({
      title: feedMetaData.title,
      summary: feedMetaData.summary,
      icon: feedMetaData.icon,
      itemsHaveIdentity: topic.itemsHaveIdentity,
      itemsHaveSpatialDimension: feedMetaData.itemsHaveSpatialDimension,
      itemPrimaryProperty: topic.itemPrimaryProperty,
      updateFrequencySeconds: feedMetaData.updateFrequencySeconds,
      mapStyle: feedMetaData.mapStyle
    });

    discardPeriodicTasks();
  }));

  it('resets form from topic and sets feed meta-data to null without emitting change when topic changes and feed meta-data does not change', fakeAsync(() => {
    const topic1 = Object.freeze({ id: 'topic1', title: 'Topic 1', mapStyle: { icon: null } });
    const topic2 = Object.freeze({ id: 'topic2', title: 'Topic 2', mapStyle: { icon: null } });

    host.topic = topic1;
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.feedMetaDataForm.value).toEqual(formValueForMetaData(topic1));
    expect(target.feedMetaDataForm.pristine).toEqual(true);
    expect(target.feedMetaDataForm.dirty).toEqual(false);

    setUserValue('title', 'Dirty');
    const expectedFormValue = { title: 'Dirty', mapStyle: { icon: null } };

    expect(target.feedMetaDataForm.pristine).toEqual(false);
    expect(target.feedMetaDataForm.dirty).toEqual(true);
    expect(formChanges).toEqual([{ ...emptyMetaDataFormValue, ...expectedFormValue }]);
    expect(target.feedMetaData).toBeNull();
    expect(metaDataChanges).toEqual([]);

    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.feedMetaDataForm.pristine).toEqual(false);
    expect(target.feedMetaDataForm.dirty).toEqual(true);
    expect(target.feedMetaData).toEqual(expectedFormValue);
    expect(metaDataChanges).toEqual([expectedFormValue]);

    host.topic = topic2;
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.feedMetaDataForm.pristine).toEqual(true);
    expect(target.feedMetaDataForm.dirty).toEqual(false);
    expect(target.feedMetaDataForm.value).toEqual(formValueForMetaData(topic2));
    expect(target.feedMetaData).toBeNull();
    expect(formChanges).toEqual([{ ...emptyMetaDataFormValue, ...expectedFormValue }]);
    expect(metaDataChanges).toEqual([expectedFormValue]);

    discardPeriodicTasks();
  }));

  it('parses update frequency as a number', fakeAsync(() => {
    setUserValue('updateFrequencySeconds', 111);
    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(formChanges).toEqual([
      {
        title: null,
        summary: null,
        icon: null,
        itemPrimaryProperty: null,
        itemSecondaryProperty: null,
        itemTemporalProperty: null,
        itemsHaveIdentity: null,
        itemsHaveSpatialDimension: null,
        updateFrequencySeconds: 111,
        mapStyle: { icon: null }
      }
    ]);
    expect(metaDataChanges).toEqual([{ updateFrequencySeconds: 111, mapStyle: { icon: null } }]);

    discardPeriodicTasks();
  }));

  describe('boolean checkbox behavior to avoid using indeterminate checkboxes', () => {
    const nullNonCheckboxKeys: Omit<FeedMetaDataNullable, FeedMetaDataBooleanKeys> = Object.freeze({
      title: null,
      summary: null,
      icon: null,
      itemPrimaryProperty: null,
      itemSecondaryProperty: null,
      itemTemporalProperty: null,
      updateFrequencySeconds: null,
      mapStyle: { icon: null }
    });

    it('parses boolean form values as booleans', fakeAsync(() => {
      let observedMetaData: FeedMetaData | null = null;
      target.feedMetaDataChanged.subscribe((metaData) => {
        observedMetaData = metaData;
      });

      setUserValue('itemsHaveIdentity', true);
      fixture.detectChanges();
      tick(debounceTimeMs + 50);

      expect(observedMetaData).toEqual({
        itemsHaveIdentity: true,
        mapStyle: { icon: null }
      });

      setUserValue('itemsHaveSpatialDimension', true);
      fixture.detectChanges();
      tick(debounceTimeMs + 50);

      expect(observedMetaData).toEqual({
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        mapStyle: { icon: null }
      });

      discardPeriodicTasks();
    }));

    it('sets boolean checkboxes from topic meta-data when not present in feed meta-data', () => {
      const topicMetaData: Required<Pick<FeedTopic, FeedMetaDataBooleanKeys>> = {
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true
      };

      host.topic = {
        id: 'topic1',
        title: 'Topic 1',
        ...topicMetaData,
        mapStyle: { icon: null }
      };
      host.feedMetaData = {};
      fixture.detectChanges();

      expect(target.feedMetaDataForm.value).toEqual({
        ...nullNonCheckboxKeys,
        ...topicMetaData,
        title: 'Topic 1'
      });

      for (const key of Object.getOwnPropertyNames(topicMetaData)) {
        const checkboxControl = target.feedMetaDataForm.get(key);
        expect(checkboxControl.pristine).toEqual(true, key);
        expect(checkboxControl.dirty).toEqual(false, key);
      }
    });

    it('does not set boolean checkboxes from topic meta-data when present in feed meta-data', fakeAsync(() => {
      const topicMetaData: Required<Pick<FeedMetaData, FeedMetaDataBooleanKeys>> = {
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true
      };
      const feedMetaData: Required<Pick<FeedMetaData, FeedMetaDataBooleanKeys>> = {
        itemsHaveIdentity: false,
        itemsHaveSpatialDimension: false
      };

      host.topic = {
        id: 'topic1',
        title: 'Topic 1',
        ...topicMetaData
      };
      host.feedMetaData = feedMetaData;
      fixture.detectChanges();
      tick(debounceTimeMs + 50);

      const expectedFormValue: FeedMetaDataNullable = {
        ...nullNonCheckboxKeys,
        ...feedMetaData,
        title: 'Topic 1'
      };

      expect(target.feedMetaDataForm.value).toEqual(expectedFormValue);

      discardPeriodicTasks();
    }));

    it('sets the checkboxes from the topic meta-data when feed meta-data changes and does not have the checkbox keys', () => {
      const topicMetaData: Pick<FeedMetaDataNullable, FeedMetaDataBooleanKeys> = {
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true
      };

      const feedMetaDataWithCheckboxKeys: Pick<FeedMetaDataNullable, FeedMetaDataBooleanKeys> = {
        itemsHaveIdentity: false,
        itemsHaveSpatialDimension: false
      };

      host.topic = {
        id: 'topic1',
        title: 'Topic 1',
        ...topicMetaData,
        mapStyle: { icon: null }
      };
      host.feedMetaData = feedMetaDataWithCheckboxKeys;
      fixture.detectChanges();

      expect(target.feedMetaData).toEqual(feedMetaDataWithCheckboxKeys);
      expect(target.feedMetaDataForm.value).toEqual({
        ...nullNonCheckboxKeys,
        ...feedMetaDataWithCheckboxKeys,
        title: 'Topic 1'
      });

      for (const key of Object.getOwnPropertyNames(feedMetaDataWithCheckboxKeys)) {
        const control = target.feedMetaDataForm.get(key);
        expect(control.pristine).toEqual(true, key);
        expect(control.dirty).toEqual(false, key);
      }

      const unspecifiedCheckboxKeys: Record<FeedMetaDataBooleanKeys, undefined> = {
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined
      };

      host.feedMetaData = unspecifiedCheckboxKeys;
      fixture.detectChanges();

      expect(target.feedMetaData).toEqual(unspecifiedCheckboxKeys);
      expect(target.feedMetaDataForm.value).toEqual({
        ...nullNonCheckboxKeys,
        ...topicMetaData,
        title: 'Topic 1'
      });

      for (const key of Object.getOwnPropertyNames(feedMetaDataWithCheckboxKeys)) {
        const control = target.feedMetaDataForm.get(key);
        expect(control.pristine).toEqual(true, key);
        expect(control.dirty).toEqual(false, key);
      }
    });

    it('includes checkbox values in the meta-data only if dirty when not in topic', fakeAsync(() => {
      host.topic = {
        id: 'topic1',
        title: 'Topic 1',
        mapStyle: { icon: null }
      };
      const topicMetaData = feedMetaDataLean(host.topic);
      fixture.detectChanges();

      expect(target.feedMetaData).toBeNull();
      expect(target.feedMetaDataForm.value).toEqual({
        ...nullNonCheckboxKeys,
        ...topicMetaData,
        itemsHaveIdentity: null,
        itemsHaveSpatialDimension: null
      });

      for (const key of Object.getOwnPropertyNames(topicMetaData)) {
        const control = target.feedMetaDataForm.get(key);
        expect(control.pristine).toEqual(true, key);
        expect(control.dirty).toEqual(false, key);
      }

      expect(metaDataChanges).toEqual([]);

      setUserValue('summary', 'No Checkboxes');
      fixture.detectChanges();
      tick(debounceTimeMs + 50);

      expect(metaDataChanges).toEqual([
        { title: topicMetaData.title, summary: 'No Checkboxes', mapStyle: { icon: null } }
      ]);
      expect(target.feedMetaData).toEqual({
        title: topicMetaData.title,
        summary: 'No Checkboxes',
        mapStyle: { icon: null }
      });

      setUserValue('itemsHaveIdentity', true);
      fixture.detectChanges();
      tick(debounceTimeMs + 50);

      expect(metaDataChanges).toEqual([
        { title: topicMetaData.title, summary: 'No Checkboxes', mapStyle: { icon: null } },
        {
          title: topicMetaData.title,
          summary: 'No Checkboxes',
          itemsHaveIdentity: true,
          mapStyle: { icon: null }
        }
      ]);
      expect(target.feedMetaData).toEqual({
        title: topicMetaData.title,
        summary: 'No Checkboxes',
        itemsHaveIdentity: true,
        mapStyle: { icon: null }
      });

      setUserValue('itemsHaveIdentity', false);
      fixture.detectChanges();
      tick(debounceTimeMs + 50);

      expect(metaDataChanges).toEqual([
        { title: topicMetaData.title, summary: 'No Checkboxes', mapStyle: { icon: null } },
        {
          title: topicMetaData.title,
          summary: 'No Checkboxes',
          itemsHaveIdentity: true,
          mapStyle: { icon: null }
        },
        {
          title: topicMetaData.title,
          summary: 'No Checkboxes',
          itemsHaveIdentity: false,
          mapStyle: { icon: null }
        }
      ]);

      expect(target.feedMetaData).toEqual({
        title: topicMetaData.title,
        summary: 'No Checkboxes',
        itemsHaveIdentity: false,
        mapStyle: { icon: null }
      });

      discardPeriodicTasks();
    }));
  });

  it('resets the form to topic meta-data when feed meta-data changes to null', fakeAsync(() => {
    host.topic = { id: 'topic1', title: 'Topic 1', mapStyle: { icon: null } };
    fixture.detectChanges();

    expect(target.feedMetaDataForm.pristine).toEqual(true);
    expect(target.feedMetaDataForm.dirty).toEqual(false);

    setUserValue('title', 'Dirty');
    const expectedChange = { title: 'Dirty', mapStyle: { icon: null } };

    expect(target.feedMetaDataForm.pristine).toEqual(false);
    expect(target.feedMetaDataForm.dirty).toEqual(true);
    expect(target.feedMetaDataForm.value).toEqual(formValueForMetaData(expectedChange));
    expect(target.feedMetaData).toEqual(null);

    fixture.detectChanges();
    tick(debounceTimeMs + 50);

    expect(target.feedMetaData).toEqual(expectedChange);

    host.feedMetaData = target.feedMetaData;
    fixture.detectChanges();

    expect(target.feedMetaData).toEqual(expectedChange);

    host.feedMetaData = null;
    fixture.detectChanges();

    expect(target.feedMetaDataForm.value).toEqual(formValueForMetaData(host.topic));
    expect(target.feedMetaData).toBeNull();
    expect(target.feedMetaDataForm.pristine).toEqual(true);
    expect(target.feedMetaDataForm.dirty).toEqual(false);
    expect(formChanges).toEqual([formValueForMetaData(expectedChange)]);
    expect(metaDataChanges).toEqual([expectedChange]);

    discardPeriodicTasks();
  }));

  describe('accepting the meta-data', () => {
    it('emits feed meta-data with value from changed non-empty inputs merged with original feed meta-data', fakeAsync(() => {
      const topic: FeedTopic = {
        id: 'topic1',
        title: 'Topic 1',
        itemPrimaryProperty: 'prop1',
        itemSecondaryProperty: 'prop2',
        itemsHaveSpatialDimension: true,
        mapStyle: { icon: null }
      };

      const topicMetaData = feedMetaDataLean(topic);
      const feedMetaData: FeedMetaData = {
        itemSecondaryProperty: 'prop3',
        itemTemporalProperty: 'prop4'
      };

      const accepted: Array<FeedMetaData | null> = [];
      target.feedMetaDataAccepted.subscribe((x) => {
        accepted.push(x);
      });

      host.topic = topic;
      host.feedMetaData = feedMetaData;
      fixture.detectChanges();

      host.acceptButtonText = 'Test Accept';

      setUserValue('summary', 'For testing');
      setUserValue('itemsHaveIdentity', true);
      setUserValue('itemSecondaryProperty', '');

      fixture.detectChanges();
      tick(debounceTimeMs + 50);

      target.onAccepted();

      expect(target.feedMetaData).toEqual({
        ..._.omit(topicMetaData, 'itemSecondaryProperty'),
        summary: 'For testing',
        itemTemporalProperty: 'prop4',
        itemsHaveIdentity: true
      });

      expect(accepted).toEqual([target.feedMetaData]);

      discardPeriodicTasks();
    }));

    it('emits null meta-data if no form inputs changed', () => {
      const topic: FeedTopic = {
        id: 'topic1',
        title: 'Topic 1',
        itemPrimaryProperty: 'prop1',
        itemSecondaryProperty: 'prop2',
        itemsHaveSpatialDimension: true
      };
      const feedMetaData: FeedMetaData = {
        itemSecondaryProperty: 'prop3',
        itemTemporalProperty: 'prop4'
      };

      const accepted: Array<FeedMetaData | null> = [];
      target.feedMetaDataAccepted.subscribe((x) => {
        accepted.push(x);
      });

      host.topic = topic;
      host.feedMetaData = feedMetaData;
      fixture.detectChanges();

      target.onAccepted();

      expect(accepted).toEqual([null]);
    });

    it('emits the correct meta-data if accepted before debounce', fakeAsync(() => {
      const topic: FeedTopic = {
        id: 'topic1',
        title: 'Topic 1',
        itemPrimaryProperty: 'prop1',
        itemSecondaryProperty: 'prop2',
        itemsHaveSpatialDimension: true,
        mapStyle: { icon: null }
      };

      const topicMetaData = feedMetaDataLean(topic);
      const feedMetaData: FeedMetaData = {
        itemTemporalProperty: 'prop4'
      };

      const accepted: Array<FeedMetaData | null> = [];
      target.feedMetaDataAccepted.subscribe((x) => {
        accepted.push(x);
      });

      host.topic = topic;
      host.feedMetaData = feedMetaData;
      fixture.detectChanges();

      setUserValue('itemSecondaryProperty', 'prop3');
      fixture.detectChanges();
      tick(debounceTimeMs / 2);

      target.onAccepted();

      expect(accepted).toEqual([
        {
          ...topicMetaData,
          itemSecondaryProperty: 'prop3',
          itemTemporalProperty: 'prop4'
        }
      ]);

      expect(target.feedMetaData).toEqual({
        ...topicMetaData,
        itemSecondaryProperty: 'prop3',
        itemTemporalProperty: 'prop4'
      });

      discardPeriodicTasks();
    }));

    it('emits empty meta-data if all values were cleared', fakeAsync(() => {
      const topic: FeedTopic = {
        id: 'topic1',
        title: 'Topic 1'
      };
      const topicMetaData = feedMetaDataLean(topic);

      const initFeedMetaData: FeedMetaData = {
        itemPrimaryProperty: 'prop1',
        updateFrequencySeconds: 100
      };

      const accepted: Array<FeedMetaData | null> = [];
      target.feedMetaDataAccepted.subscribe((x) => {
        accepted.push(x);
      });

      host.topic = topic;
      host.feedMetaData = initFeedMetaData;
      fixture.detectChanges();

      expect(target.feedMetaData).toEqual(initFeedMetaData);
      expect(target.feedMetaDataForm.value).toEqual({
        ...emptyMetaDataFormValue,
        ...topicMetaData,
        ...initFeedMetaData
      });

      setUserValue('title', '');
      fixture.detectChanges();
      tick(debounceTimeMs / 10);

      setUserValue('itemPrimaryProperty', '');
      fixture.detectChanges();
      tick(debounceTimeMs / 10);

      setUserValue('updateFrequencySeconds', null);
      fixture.detectChanges();
      tick(debounceTimeMs + 50);

      target.onAccepted();

      expect(target.feedMetaDataForm.value).toEqual({
        ...emptyMetaDataFormValue,
        title: '',
        itemPrimaryProperty: ''
      });

      expect(accepted).toEqual([{ mapStyle: { icon: null } }]);

      discardPeriodicTasks();
    }));
  });
});
