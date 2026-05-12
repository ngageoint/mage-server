import { SimpleChange, SimpleChanges } from '@angular/core';
import { fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import * as _ from 'lodash';
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

type FeedMetaDataBooleanKeys =
  | 'itemsHaveIdentity'
  | 'itemsHaveSpatialDimension';

const emptyMetaDataFormValue: FeedMetaDataNullable = {
  title: null,
  summary: null,
  icon: null,
  itemPrimaryProperty: null,
  itemSecondaryProperty: null,
  itemTemporalProperty: null,
  itemsHaveIdentity: null,
  itemsHaveSpatialDimension: null,
  updateFrequencySeconds: null
};

describe('FeedMetaDataComponent', () => {
  let target: AdminFeedEditConfigurationComponent;
  let debounceTimeMs: number;
  let formChanges: FeedMetaDataNullable[];
  let metaDataChanges: FeedMetaData[];

  function createTarget(): void {
    target = new AdminFeedEditConfigurationComponent();
    target.topic = null;
    target.feedMetaData = null;
    target.buttonText = 'Test Accept';

    target.ngOnInit();

    debounceTimeMs = target.changeDebounceInterval;
    formChanges = [];
    metaDataChanges = [];

    target.feedMetaDataForm.valueChanges.subscribe((formValue) => {
      formChanges.push(formValue);
    });

    target.feedMetaDataChanged.subscribe((metaData) => {
      metaDataChanges.push(metaData);
    });
  }

  function simpleChange<T>(
    previousValue: T,
    currentValue: T,
    firstChange = false
  ): SimpleChange {
    return new SimpleChange(previousValue, currentValue, firstChange);
  }

  function applyChanges(changes: SimpleChanges): void {
    target.ngOnChanges(changes);
  }

  function setTopic(topic: FeedTopic | null): void {
    const previousTopic = target.topic;
    target.topic = topic;

    applyChanges({
      topic: simpleChange(previousTopic, topic, previousTopic === undefined)
    });
  }

  function setFeedMetaData(feedMetaData: FeedMetaData | null): void {
    const previousFeedMetaData = target.feedMetaData;
    target.feedMetaData = feedMetaData;

    applyChanges({
      feedMetaData: simpleChange(
        previousFeedMetaData,
        feedMetaData,
        previousFeedMetaData === undefined
      )
    });
  }

  function setTopicAndFeedMetaData(
    topic: FeedTopic | null,
    feedMetaData: FeedMetaData | null
  ): void {
    const previousTopic = target.topic;
    const previousFeedMetaData = target.feedMetaData;

    target.topic = topic;
    target.feedMetaData = feedMetaData;

    applyChanges({
      topic: simpleChange(previousTopic, topic, previousTopic === undefined),
      feedMetaData: simpleChange(
        previousFeedMetaData,
        feedMetaData,
        previousFeedMetaData === undefined
      )
    });
  }

  function setUserValue<K extends keyof FeedMetaDataNullable>(
    key: K,
    value: FeedMetaDataNullable[K]
  ): void {
    const control = target.feedMetaDataForm.get(key as string);

    if (!control) {
      throw new Error(`Missing control ${String(key)}`);
    }

    control.setValue(value);
    control.markAsDirty();
  }

  beforeEach(() => {
    createTarget();
  });

  afterEach(() => {
    try {
      discardPeriodicTasks();
    } catch {}
  });

  it('should create', () => {
    expect(target).toBeTruthy();
  });

  describe('mapping meta-data to form value', () => {
    it('maps absent keys to null form values', () => {
      expect(formValueForMetaData({})).toEqual(emptyMetaDataFormValue);
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
        updateFrequencySeconds: undefined
      };

      expect(formValueForMetaData(undefinedKeys)).toEqual(
        emptyMetaDataFormValue
      );
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
        updateFrequencySeconds: 60
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
        itemsHaveIdentity: false
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
    tick(debounceTimeMs / 2);

    expect(formChanges).toEqual([
      {
        ...emptyMetaDataFormValue,
        title: 'Test'
      }
    ]);
    expect(metaDataChanges).toEqual([]);

    tick(debounceTimeMs + 50);

    expect(formChanges).toEqual([
      {
        ...emptyMetaDataFormValue,
        title: 'Test'
      }
    ]);
    expect(metaDataChanges).toEqual([
      {
        title: 'Test'
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
      icon: { id: 'icon123' }
    };

    setTopicAndFeedMetaData(topic, initFeedMetaData);

    setUserValue('title', 'Feed 1 Mod');
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

    setTopicAndFeedMetaData(topic, feedMetaData);

    expect(target.feedMetaDataForm.value).toEqual({
      ...emptyMetaDataFormValue,
      title: 'Feed 1'
    });
    expect(target.feedMetaDataForm.dirty).toEqual(false);

    setUserValue('title', '');
    setUserValue('summary', 'Feed summary');

    tick(debounceTimeMs + 50);

    expect(formChanges).toEqual([
      {
        ...emptyMetaDataFormValue,
        title: ''
      },
      {
        ...emptyMetaDataFormValue,
        title: '',
        summary: 'Feed summary'
      }
    ]);
    expect(metaDataChanges).toEqual([{ summary: 'Feed summary' }]);
    expect(target.feedMetaData).toEqual({ summary: 'Feed summary' });

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
      updateFrequencySeconds: 60
    };

    const topic: FeedTopic = {
      id: 'topic1',
      ...topicMetaData,
      icon: { sourceUrl: 'test://icon1.png' }
    };

    setTopic(topic);

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
      itemsHaveSpatialDimension: false
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
      itemsHaveSpatialDimension: true
    });

    setTopicAndFeedMetaData({ id: 'topic1', title: 'Topic 1' }, feedMetaData);

    expect(target.feedMetaDataForm.value).toEqual(
      formValueForMetaData(feedMetaData)
    );
    expect(target.feedMetaData).toEqual(feedMetaData);

    setFeedMetaData(feedMetaDataMod);
    tick(debounceTimeMs + 50);

    expect(target.feedMetaDataForm.value).toEqual(
      formValueForMetaData(feedMetaDataMod)
    );
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
      updateFrequencySeconds: 3000
    });

    const feedMetaData: FeedMetaData = Object.freeze({
      title: 'Feed Title',
      summary: 'Feed summary',
      itemsHaveSpatialDimension: true,
      itemSecondaryProperty: 'prop2',
      icon: { id: 'feedicon1' },
      updateFrequencySeconds: 0
    });

    setTopic(topic);
    tick(debounceTimeMs + 50);

    expect(target.topic).toEqual(topic);
    expect(target.feedMetaDataForm.value).toEqual(formValueForMetaData(topic));

    setFeedMetaData(feedMetaData);
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
        updateFrequencySeconds: feedMetaData.updateFrequencySeconds
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
      updateFrequencySeconds: 3000
    });

    const feedMetaData: FeedMetaData = Object.freeze({
      title: 'Feed Title',
      summary: 'Feed summary',
      itemsHaveSpatialDimension: true,
      itemSecondaryProperty: 'prop2',
      icon: { id: 'feedicon1' },
      updateFrequencySeconds: 0
    });

    setTopicAndFeedMetaData(topic, feedMetaData);
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
        updateFrequencySeconds: feedMetaData.updateFrequencySeconds
      })
    );
    expect(formChanges).toEqual([]);
    expect(metaDataChanges).toEqual([]);

    setUserValue('itemSecondaryProperty', '');
    tick(debounceTimeMs + 50);

    setFeedMetaData(target.feedMetaData);

    expect(target.feedMetaDataForm.value).toEqual(
      formValueForMetaData({
        title: feedMetaData.title,
        summary: feedMetaData.summary,
        icon: feedMetaData.icon,
        itemsHaveIdentity: topic.itemsHaveIdentity,
        itemsHaveSpatialDimension: feedMetaData.itemsHaveSpatialDimension,
        itemPrimaryProperty: topic.itemPrimaryProperty,
        itemSecondaryProperty: null,
        updateFrequencySeconds: feedMetaData.updateFrequencySeconds
      })
    );
    expect(target.feedMetaData).toEqual({
      title: feedMetaData.title,
      summary: feedMetaData.summary,
      icon: feedMetaData.icon,
      itemsHaveIdentity: topic.itemsHaveIdentity,
      itemsHaveSpatialDimension: feedMetaData.itemsHaveSpatialDimension,
      itemPrimaryProperty: topic.itemPrimaryProperty,
      updateFrequencySeconds: feedMetaData.updateFrequencySeconds
    });

    discardPeriodicTasks();
  }));

  it('resets form from topic and sets feed meta-data to null without emitting change when topic changes and feed meta-data does not change', fakeAsync(() => {
    const topic1 = Object.freeze({ id: 'topic1', title: 'Topic 1' });
    const topic2 = Object.freeze({ id: 'topic2', title: 'Topic 2' });

    setTopic(topic1);
    tick(debounceTimeMs + 50);

    expect(target.feedMetaDataForm.value).toEqual(formValueForMetaData(topic1));
    expect(target.feedMetaDataForm.pristine).toEqual(true);
    expect(target.feedMetaDataForm.dirty).toEqual(false);

    setUserValue('title', 'Dirty');

    expect(target.feedMetaDataForm.pristine).toEqual(false);
    expect(target.feedMetaDataForm.dirty).toEqual(true);
    expect(formChanges).toEqual([
      { ...emptyMetaDataFormValue, title: 'Dirty' }
    ]);
    expect(target.feedMetaData).toBeNull();
    expect(metaDataChanges).toEqual([]);

    tick(debounceTimeMs + 50);

    expect(target.feedMetaDataForm.pristine).toEqual(false);
    expect(target.feedMetaDataForm.dirty).toEqual(true);
    expect(target.feedMetaData).toEqual({ title: 'Dirty' });
    expect(metaDataChanges).toEqual([{ title: 'Dirty' }]);

    setTopic(topic2);
    tick(debounceTimeMs + 50);

    expect(target.feedMetaDataForm.pristine).toEqual(true);
    expect(target.feedMetaDataForm.dirty).toEqual(false);
    expect(target.feedMetaDataForm.value).toEqual(formValueForMetaData(topic2));
    expect(target.feedMetaData).toBeNull();
    expect(formChanges).toEqual([
      { ...emptyMetaDataFormValue, title: 'Dirty' }
    ]);
    expect(metaDataChanges).toEqual([{ title: 'Dirty' }]);

    discardPeriodicTasks();
  }));

  it('parses update frequency as a number', fakeAsync(() => {
    setUserValue('updateFrequencySeconds', 111);
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
        updateFrequencySeconds: 111
      }
    ]);
    expect(metaDataChanges).toEqual([{ updateFrequencySeconds: 111 }]);

    discardPeriodicTasks();
  }));

  describe('boolean checkbox behavior to avoid using indeterminate checkboxes', () => {
    const nullNonCheckboxKeys: Omit<
      FeedMetaDataNullable,
      FeedMetaDataBooleanKeys
    > = Object.freeze({
      title: null,
      summary: null,
      icon: null,
      itemPrimaryProperty: null,
      itemSecondaryProperty: null,
      itemTemporalProperty: null,
      updateFrequencySeconds: null
    });

    it('parses boolean form values as booleans', fakeAsync(() => {
      let observedMetaData: FeedMetaData | null = null;

      target.feedMetaDataChanged.subscribe((metaData) => {
        observedMetaData = metaData;
      });

      setUserValue('itemsHaveIdentity', true);
      tick(debounceTimeMs + 50);

      expect(observedMetaData).toEqual({
        itemsHaveIdentity: true
      });

      setUserValue('itemsHaveSpatialDimension', true);
      tick(debounceTimeMs + 50);

      expect(observedMetaData).toEqual({
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true
      });

      discardPeriodicTasks();
    }));

    it('sets boolean checkboxes from topic meta-data when not present in feed meta-data', () => {
      const topicMetaData: Required<Pick<FeedTopic, FeedMetaDataBooleanKeys>> =
        {
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true
        };

      setTopic({
        id: 'topic1',
        title: 'Topic 1',
        ...topicMetaData
      });

      setFeedMetaData({});

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
      const topicMetaData: Required<
        Pick<FeedMetaData, FeedMetaDataBooleanKeys>
      > = {
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true
      };

      const feedMetaData: Required<
        Pick<FeedMetaData, FeedMetaDataBooleanKeys>
      > = {
        itemsHaveIdentity: false,
        itemsHaveSpatialDimension: false
      };

      setTopicAndFeedMetaData(
        {
          id: 'topic1',
          title: 'Topic 1',
          ...topicMetaData
        },
        feedMetaData
      );

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
      const topicMetaData: Pick<FeedMetaDataNullable, FeedMetaDataBooleanKeys> =
        {
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true
        };

      const feedMetaDataWithCheckboxKeys: Pick<
        FeedMetaDataNullable,
        FeedMetaDataBooleanKeys
      > = {
        itemsHaveIdentity: false,
        itemsHaveSpatialDimension: false
      };

      setTopicAndFeedMetaData(
        {
          id: 'topic1',
          title: 'Topic 1',
          ...topicMetaData
        },
        feedMetaDataWithCheckboxKeys
      );

      expect(target.feedMetaData).toEqual(feedMetaDataWithCheckboxKeys);
      expect(target.feedMetaDataForm.value).toEqual({
        ...nullNonCheckboxKeys,
        ...feedMetaDataWithCheckboxKeys,
        title: 'Topic 1'
      });

      for (const key of Object.getOwnPropertyNames(
        feedMetaDataWithCheckboxKeys
      )) {
        const control = target.feedMetaDataForm.get(key);
        expect(control.pristine).toEqual(true, key);
        expect(control.dirty).toEqual(false, key);
      }

      const unspecifiedCheckboxKeys: Record<
        FeedMetaDataBooleanKeys,
        undefined
      > = {
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined
      };

      setFeedMetaData(unspecifiedCheckboxKeys);

      expect(target.feedMetaData).toEqual(unspecifiedCheckboxKeys);
      expect(target.feedMetaDataForm.value).toEqual({
        ...nullNonCheckboxKeys,
        ...topicMetaData,
        title: 'Topic 1'
      });

      for (const key of Object.getOwnPropertyNames(
        feedMetaDataWithCheckboxKeys
      )) {
        const control = target.feedMetaDataForm.get(key);
        expect(control.pristine).toEqual(true, key);
        expect(control.dirty).toEqual(false, key);
      }
    });

    it('includes checkbox values in the meta-data only if dirty when not in topic', fakeAsync(() => {
      setTopic({
        id: 'topic1',
        title: 'Topic 1'
      });

      const topicMetaData = feedMetaDataLean(target.topic);
      tick(debounceTimeMs + 50);

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
      tick(debounceTimeMs + 50);

      expect(metaDataChanges).toEqual([
        { title: topicMetaData.title, summary: 'No Checkboxes' }
      ]);
      expect(target.feedMetaData).toEqual({
        title: topicMetaData.title,
        summary: 'No Checkboxes'
      });

      setUserValue('itemsHaveIdentity', true);
      tick(debounceTimeMs + 50);

      expect(metaDataChanges).toEqual([
        { title: topicMetaData.title, summary: 'No Checkboxes' },
        {
          title: topicMetaData.title,
          summary: 'No Checkboxes',
          itemsHaveIdentity: true
        }
      ]);
      expect(target.feedMetaData).toEqual({
        title: topicMetaData.title,
        summary: 'No Checkboxes',
        itemsHaveIdentity: true
      });

      setUserValue('itemsHaveIdentity', false);
      tick(debounceTimeMs + 50);

      expect(metaDataChanges).toEqual([
        { title: topicMetaData.title, summary: 'No Checkboxes' },
        {
          title: topicMetaData.title,
          summary: 'No Checkboxes',
          itemsHaveIdentity: true
        },
        {
          title: topicMetaData.title,
          summary: 'No Checkboxes',
          itemsHaveIdentity: false
        }
      ]);

      expect(target.feedMetaData).toEqual({
        title: topicMetaData.title,
        summary: 'No Checkboxes',
        itemsHaveIdentity: false
      });

      discardPeriodicTasks();
    }));
  });

  it('resets the form to topic meta-data when feed meta-data changes to null', fakeAsync(() => {
    setTopic({ id: 'topic1', title: 'Topic 1' });

    expect(target.feedMetaDataForm.pristine).toEqual(true);
    expect(target.feedMetaDataForm.dirty).toEqual(false);

    setUserValue('title', 'Dirty');

    expect(target.feedMetaDataForm.pristine).toEqual(false);
    expect(target.feedMetaDataForm.dirty).toEqual(true);
    expect(target.feedMetaDataForm.value).toEqual(
      formValueForMetaData({ title: 'Dirty' })
    );
    expect(target.feedMetaData).toEqual(null);

    tick(debounceTimeMs + 50);

    expect(target.feedMetaData).toEqual({ title: 'Dirty' });

    setFeedMetaData(target.feedMetaData);

    expect(target.feedMetaData).toEqual({ title: 'Dirty' });

    setFeedMetaData(null);

    expect(target.feedMetaDataForm.value).toEqual(
      formValueForMetaData(target.topic)
    );
    expect(target.feedMetaData).toBeNull();
    expect(target.feedMetaDataForm.pristine).toEqual(true);
    expect(target.feedMetaDataForm.dirty).toEqual(false);
    expect(formChanges).toEqual([formValueForMetaData({ title: 'Dirty' })]);
    expect(metaDataChanges).toEqual([{ title: 'Dirty' }]);

    discardPeriodicTasks();
  }));

  describe('accepting the meta-data', () => {
    it('emits feed meta-data with value from changed non-empty inputs merged with original feed meta-data', fakeAsync(() => {
      const topic: FeedTopic = {
        id: 'topic1',
        title: 'Topic 1',
        itemPrimaryProperty: 'prop1',
        itemSecondaryProperty: 'prop2',
        itemsHaveSpatialDimension: true
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

      setTopicAndFeedMetaData(topic, feedMetaData);

      target.buttonText = 'Test Accept';

      setUserValue('summary', 'For testing');
      setUserValue('itemsHaveIdentity', true);
      setUserValue('itemSecondaryProperty', '');

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

      setTopicAndFeedMetaData(topic, feedMetaData);

      target.onAccepted();

      expect(accepted).toEqual([null]);
    });

    it('emits the correct meta-data if accepted before debounce', fakeAsync(() => {
      const topic: FeedTopic = {
        id: 'topic1',
        title: 'Topic 1',
        itemPrimaryProperty: 'prop1',
        itemSecondaryProperty: 'prop2',
        itemsHaveSpatialDimension: true
      };

      const topicMetaData = feedMetaDataLean(topic);

      const feedMetaData: FeedMetaData = {
        itemTemporalProperty: 'prop4'
      };

      const accepted: Array<FeedMetaData | null> = [];
      target.feedMetaDataAccepted.subscribe((x) => {
        accepted.push(x);
      });

      setTopicAndFeedMetaData(topic, feedMetaData);

      setUserValue('itemSecondaryProperty', 'prop3');
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

      setTopicAndFeedMetaData(topic, initFeedMetaData);

      expect(target.feedMetaData).toEqual(initFeedMetaData);
      expect(target.feedMetaDataForm.value).toEqual({
        ...emptyMetaDataFormValue,
        ...topicMetaData,
        ...initFeedMetaData
      });

      setUserValue('title', '');
      tick(debounceTimeMs / 10);

      setUserValue('itemPrimaryProperty', '');
      tick(debounceTimeMs / 10);

      setUserValue('updateFrequencySeconds', null);
      tick(debounceTimeMs + 50);

      target.onAccepted();

      expect(target.feedMetaDataForm.value).toEqual({
        ...emptyMetaDataFormValue,
        title: '',
        itemPrimaryProperty: ''
      });

      expect(accepted).toEqual([{}]);

      discardPeriodicTasks();
    }));
  });
});
