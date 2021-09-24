import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Feature } from 'geojson'
import { BehaviorSubject, Observable, Subject } from 'rxjs'
import { Feed, FeedContent, FeedExpanded, FeedPost, FeedPreview, FeedTopic, Service, ServiceType, StyledFeature } from './feed.model'


export interface FeedPreviewOptions {
  skipContentFetch?: boolean
}

@Injectable({
  providedIn: 'root'
})
export class FeedService {

  constructor(private http: HttpClient) { }

  // TODO: there is probably a better solution than maintaining this map here
  private _feeds = new BehaviorSubject<Array<Feed>>([]);
  readonly feeds = this._feeds.asObservable();

  private _feedItems = new Map<string, BehaviorSubject<Array<Feature>>>();
  feedItems(feedId: string): Observable<Array<Feature>> {
    return this._feedItems.get(feedId).asObservable();
  }

  fetchAllFeeds(): Observable<Array<Feed>> {
    return this.http.get<Array<Feed>>('/api/feeds/');
  }

  fetchFeed(feedId: string): Observable<FeedExpanded> {
    return this.http.get<FeedExpanded>(`/api/feeds/${feedId}`);
  }

  fetchService(serviceId: string): Observable<Service> {
    return this.http.get<Service>(`/api/feeds/services/${serviceId}`);
  }

  createService(service: { title: string, summary?: string, serviceType: string, config: any}): Observable<Service> {
    return this.http.post<Service>(`/api/feeds/services`, service);
  }

  fetchServices(): Observable<Array<Service>> {
    return this.http.get<Array<Service>>(`/api/feeds/services`);
  }

  fetchServiceFeeds(serviceId: string): Observable<Array<Feed>> {
    return this.http.get<Array<Feed>>(`/api/feeds/services/${serviceId}/feeds`);
  }

  fetchServiceType(serviceTypeId: string): Observable<ServiceType> {
    return this.http.get<ServiceType>(`/api/feeds/service_types/${serviceTypeId}`);
  }

  fetchTopics(serviceId: string): Observable<Array<FeedTopic>> {
    return this.http.get<Array<FeedTopic>>(`/api/feeds/services/${serviceId}/topics`);
  }

  previewFeed(serviceId: string, topicId: string, feedSpec: Partial<Omit<FeedPost, 'service' | 'topic'>>, opts?: FeedPreviewOptions): Observable<FeedPreview> {
    opts = opts || {}
    const skipContentFetch: boolean = opts.skipContentFetch === true
    return this.http.post<FeedPreview>(
      `/api/feeds/services/${serviceId}/topics/${topicId}/feed_preview?skip_content_fetch=${skipContentFetch}`,
      { feed: feedSpec });
  }

  fetchTopic(serviceId: string, topicId: string): Observable<FeedTopic> {
    return this.http.get<FeedTopic>(`/api/feeds/services/${serviceId}/topics/${topicId}`);
  }

  fetchServiceTypes(): Observable<Array<ServiceType>> {
    return this.http.get<Array<ServiceType>>(`/api/feeds/service_types`);
  }

  createFeed(serviceId: string, topicId: string, feedConfiguration: any): Observable<FeedExpanded> {
    return this.http.post<FeedExpanded>(`/api/feeds/services/${serviceId}/topics/${topicId}/feeds`, feedConfiguration);
  }

  updateFeed(feed: Partial<Omit<FeedPost, 'id'>> & Pick<Feed, 'id'>): Observable<FeedExpanded> {
    return this.http.put<FeedExpanded>(`/api/feeds/${feed.id}`, feed);
  }

  deleteFeed(feed: Feed | FeedExpanded): Observable<{}> {
    return this.http.delete(`/api/feeds/${feed.id}`, {responseType: 'text'});
  }

  deleteService(service: Service): Observable<{}> {
    console.log('delete')
    return this.http.delete(`/api/feeds/services/${service.id}`, { responseType: 'text' });
  }

  fetchFeeds(eventId: number): Observable<Array<Feed>> {
    const subject = new Subject<Array<Feed>>();
    this.http.get<Array<Feed>>(`/api/events/${eventId}/feeds`).subscribe(feeds => {
      feeds.map(feed => {
        feed.id = feed.id.toString();
        return feed;
      });

      feeds.forEach(feed => {
        let feedItems = this._feedItems.get(feed.id);
        if (!feedItems) {
          feedItems = new BehaviorSubject<Array<Feature>>([]);
          this._feedItems.set(feed.id, feedItems);
        }
      })

      subject.next(feeds);
      this._feeds.next(feeds);
    });

    return subject;
  }

  fetchFeedItems(event: any, feed: Feed): Observable<FeedContent> {
    const subject = new Subject<FeedContent>()
    const feedItems = this._feedItems.get(feed.id)
    this.http.post<FeedContent>(`/api/events/${event.id}/feeds/${feed.id}/content`, {}).subscribe(content => {
      const features = content.items.features
      features.map((feature: StyledFeature) => {
        feature.id = String(feature.id)
        feature.properties = feature.properties || {}
        return feature
      })
      subject.next(content)
      feedItems.next(features)
    })
    return subject
  }
}
