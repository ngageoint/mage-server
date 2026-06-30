import { of, throwError } from 'rxjs';
import { FeedEditService } from './feed-edit.service';
import { FeedService } from '@ngageoint/mage.web-core-lib/feed/feed.service';
import {
  FeedExpanded,
  FeedPreview,
  FeedTopic,
  Service
} from '@ngageoint/mage.web-core-lib/feed/feed.model';
import { feedPostFromEditState } from './feed-edit.model';
import * as _ from 'lodash';

describe('FeedEditService', () => {
  let feedEdit: FeedEditService;
  let feedService: jasmine.SpyObj<FeedService>;

  const makeService = (id: string): Service =>
    ({
      id,
      serviceType: 'type',
      title: `Service ${id}`,
      summary: `Summary ${id}`,
      config: { enabled: true }
    } as any);

  const makeTopic = (id: string): FeedTopic =>
    ({
      id,
      title: `Topic ${id}`,
      itemPrimaryProperty: 'primary',
      itemTemporalProperty: 'timestamp',
      itemsHaveIdentity: false,
      itemPropertiesSchema: { properties: { primary: { type: 'string' } } }
    } as any);

  const makePreview = (): FeedPreview =>
    ({
      feed: { id: 'preview', title: 'Preview', service: 'svc', topic: 'tpc' },
      content: {
        feed: 'preview',
        items: { type: 'FeatureCollection', features: [] }
      }
    } as any);

  beforeEach(() => {
    feedService = jasmine.createSpyObj<FeedService>('FeedService', [
      'fetchServices',
      'fetchTopics',
      'fetchFeed',
      'previewFeed',
      'createFeed',
      'updateFeed'
    ]);
    feedEdit = new FeedEditService(feedService);
  });

  it('starts with an empty-ish state', () => {
    const s = feedEdit.currentState;
    expect(s.originalFeed).toBeNull();
    expect(s.availableServices).toEqual([]);
    expect(s.selectedService).toBeNull();
    expect(s.availableTopics).toEqual([]);
    expect(s.selectedTopic).toBeNull();
    expect(s.fetchParameters).toBeNull();
    expect(s.itemPropertiesSchema).toBeNull();
    expect(s.feedMetaData).toBeNull();
    expect(s.preview).toBeNull();
  });

  describe('new feed flow', () => {
    it('newFeed resets and fetches services', () => {
      const services = [makeService('a'), makeService('b')];
      feedService.fetchServices.and.returnValue(of(services));

      feedEdit.newFeed();

      expect(feedService.fetchServices).toHaveBeenCalled();
      expect(feedEdit.currentState.availableServices).toEqual(services);
      expect(feedEdit.currentState.selectedService).toBeNull();
      expect(feedEdit.currentState.selectedTopic).toBeNull();
    });

    it('selectService ignores selection when service id is not in availableServices', () => {
      feedService.fetchServices.and.returnValue(of([makeService('a')]));
      feedEdit.newFeed();

      feedEdit.selectService('nope');

      expect(feedEdit.currentState.selectedService).toBeNull();
      expect(feedService.fetchTopics).not.toHaveBeenCalled();
    });

    it('selectService sets selectedService and fetches topics', () => {
      const serviceA = makeService('a');
      const serviceB = makeService('b');
      const topicsB = [makeTopic('b.1')];
      feedService.fetchServices.and.returnValue(of([serviceA, serviceB]));
      feedService.fetchTopics
        .withArgs(serviceB.id)
        .and.returnValue(of(topicsB));

      feedEdit.newFeed();
      feedEdit.selectService(serviceB.id);

      expect(feedEdit.currentState.selectedService).toEqual(serviceB);
      expect(feedService.fetchTopics).toHaveBeenCalledWith(serviceB.id);
      expect(feedEdit.currentState.availableTopics).toEqual(topicsB);
    });

    it('selectTopic resets dependent fields (meta/schema/params/preview)', () => {
      const service = makeService('a');
      const topics = [makeTopic('a.1'), makeTopic('a.2')];
      feedService.fetchServices.and.returnValue(of([service]));
      feedService.fetchTopics.withArgs(service.id).and.returnValue(of(topics));
      feedService.previewFeed.and.returnValue(of(makePreview()));

      feedEdit.newFeed();
      feedEdit.selectService(service.id);
      feedEdit.selectTopic(topics[0].id);

      feedEdit.fetchParametersChanged({ x: 1 });
      feedEdit.itemPropertiesSchemaChanged({
        properties: { x: { type: 'string' } }
      });
      feedEdit.feedMetaDataChanged({ title: 'X' });

      expect(feedEdit.currentState.fetchParameters).toEqual({ x: 1 });
      expect(feedEdit.currentState.itemPropertiesSchema).toEqual({
        properties: { x: { type: 'string' } }
      });
      expect(feedEdit.currentState.feedMetaData).toEqual({ title: 'X' });
      expect(feedEdit.currentState.preview).not.toBeNull();

      feedEdit.selectTopic(topics[1].id);

      expect(feedEdit.currentState.selectedTopic).toEqual(topics[1]);
      expect(feedEdit.currentState.fetchParameters).toBeNull();
      expect(feedEdit.currentState.itemPropertiesSchema).toBeNull();
      expect(feedEdit.currentState.feedMetaData).toBeNull();
      expect(feedEdit.currentState.preview).toBeNull();
    });

    it('fetchParametersChanged does nothing without a selected topic', () => {
      feedService.fetchServices.and.returnValue(of([makeService('a')]));

      feedEdit.newFeed();
      feedEdit.fetchParametersChanged({ anything: true });

      expect(feedEdit.currentState.fetchParameters).toBeNull();
      expect(feedService.previewFeed).not.toHaveBeenCalled();
    });

    it('fetchParametersChanged triggers preview fetch with content', () => {
      const service = makeService('a');
      const topic = makeTopic('a.1');
      const preview = makePreview();
      feedService.fetchServices.and.returnValue(of([service]));
      feedService.fetchTopics.withArgs(service.id).and.returnValue(of([topic]));
      feedService.previewFeed.and.returnValue(of(preview));

      feedEdit.newFeed();
      feedEdit.selectService(service.id);
      feedEdit.selectTopic(topic.id);

      feedEdit.fetchParametersChanged({ q: 1 });

      expect(feedService.previewFeed).toHaveBeenCalled();
      expect(feedEdit.currentState.fetchParameters).toEqual({ q: 1 });
      expect(feedEdit.currentState.preview).toEqual(preview);
    });

    it('feedMetaDataChanged fetches preview without content', () => {
      const service = makeService('a');
      const topic = makeTopic('a.1');
      const previewNoContent: FeedPreview = { feed: makePreview().feed } as any;

      feedService.fetchServices.and.returnValue(of([service]));
      feedService.fetchTopics.withArgs(service.id).and.returnValue(of([topic]));
      feedService.previewFeed
        .withArgs(jasmine.anything(), jasmine.anything(), jasmine.anything(), {
          skipContentFetch: true
        })
        .and.returnValue(of(previewNoContent));

      feedEdit.newFeed();
      feedEdit.selectService(service.id);
      feedEdit.selectTopic(topic.id);

      feedEdit.feedMetaDataChanged({ title: 'Changed' });

      expect(feedService.previewFeed).toHaveBeenCalledWith(
        service.id,
        topic.id,
        jasmine.anything(),
        { skipContentFetch: true }
      );
      expect(feedEdit.currentState.feedMetaData).toEqual({ title: 'Changed' });
      expect(feedEdit.currentState.preview).toEqual(previewNoContent);
    });
  });

  describe('edit existing feed flow', () => {
    it('editFeed resets and locks service/topic selection', () => {
      const service = makeService('a');
      const topic = makeTopic('a.1');
      const feed: FeedExpanded = {
        id: 'feed-1',
        title: 'Existing',
        service,
        topic,
        constantParams: { x: 1 },
        itemPropertiesSchema: { properties: { x: { type: 'number' } } }
      } as any;

      feedService.fetchFeed.withArgs(feed.id).and.returnValue(of(feed));
      feedService.previewFeed.and.returnValue(of(makePreview()));

      feedEdit.editFeed(feed.id);

      expect(feedService.fetchFeed).toHaveBeenCalledWith(feed.id);
      expect(feedEdit.currentState.originalFeed).toEqual(jasmine.anything());
      expect(feedEdit.currentState.selectedService).toEqual(service);
      expect(feedEdit.currentState.selectedTopic).toEqual(topic);

      feedEdit.selectService('other');
      feedEdit.selectTopic('other');

      expect(feedEdit.currentState.selectedService).toEqual(service);
      expect(feedEdit.currentState.selectedTopic).toEqual(topic);
    });
  });

  describe('saving', () => {
    beforeEach(() => {
      feedService.previewFeed.and.returnValue(of(makePreview()));
    });

    it('saveFeed errors without selected service', () => {
      let error: any = null;
      feedEdit.saveFeed().subscribe({ error: (e) => (error = e) });
      expect(error?.message).toBe('no service selected');
      expect(feedService.createFeed).not.toHaveBeenCalled();
      expect(feedService.updateFeed).not.toHaveBeenCalled();
    });

    it('saveFeed errors without selected topic', () => {
      const service = makeService('a');
      feedService.fetchServices.and.returnValue(of([service]));
      feedService.fetchTopics.withArgs(service.id).and.returnValue(of([]));

      feedEdit.newFeed();
      feedEdit.selectService(service.id);

      let error: any = null;
      feedEdit.saveFeed().subscribe({ error: (e) => (error = e) });
      expect(error?.message).toBe('no topic selected');
      expect(feedService.createFeed).not.toHaveBeenCalled();
      expect(feedService.updateFeed).not.toHaveBeenCalled();
    });

    it('creates a feed when originalFeed is null', () => {
      const service = makeService('a');
      const topic = makeTopic('a.1');
      const created: FeedExpanded = {
        id: 'created',
        service,
        topic,
        title: 'Created'
      } as any;

      feedService.fetchServices.and.returnValue(of([service]));
      feedService.fetchTopics.withArgs(service.id).and.returnValue(of([topic]));
      feedService.createFeed.and.returnValue(of(created));

      feedEdit.newFeed();
      feedEdit.selectService(service.id);
      feedEdit.selectTopic(topic.id);

      const post = feedPostFromEditState(_.cloneDeep(feedEdit.currentState));

      let result: any = null;
      feedEdit.saveFeed().subscribe((x) => (result = x));

      expect(result).toEqual(created);
      expect(feedService.createFeed).toHaveBeenCalledWith(
        service.id,
        topic.id,
        post
      );
    });

    it('updates a feed when originalFeed exists', () => {
      const service = makeService('a');
      const topic = makeTopic('a.1');
      const original: FeedExpanded = {
        id: 'feed-1',
        service,
        topic,
        title: 'Original'
      } as any;
      const updated: FeedExpanded = {
        id: 'feed-1',
        service,
        topic,
        title: 'Updated'
      } as any;

      feedService.fetchFeed.withArgs(original.id).and.returnValue(of(original));
      feedService.updateFeed.and.returnValue(of(updated));

      feedEdit.editFeed(original.id);

      const post = feedPostFromEditState(_.cloneDeep(feedEdit.currentState));

      let result: any = null;
      feedEdit.saveFeed().subscribe((x) => (result = x));

      expect(result).toEqual(updated);
      expect(feedService.updateFeed).toHaveBeenCalledWith({
        ...post,
        id: original.id
      });
    });

    it('does not reset state on save error', () => {
      const service = makeService('a');
      const topic = makeTopic('a.1');

      feedService.fetchServices.and.returnValue(of([service]));
      feedService.fetchTopics.withArgs(service.id).and.returnValue(of([topic]));
      feedService.createFeed.and.returnValue(throwError(new Error('nope')));

      feedEdit.newFeed();
      feedEdit.selectService(service.id);
      feedEdit.selectTopic(topic.id);
      feedEdit.fetchParametersChanged({ keep: true });

      const before = _.cloneDeep(feedEdit.currentState);

      feedEdit.saveFeed().subscribe({ error: () => {} });

      expect(feedEdit.currentState).toEqual(before);
    });
  });
});
