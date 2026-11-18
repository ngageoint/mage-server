import { Injectable, ComponentFactoryResolver, Injector, ApplicationRef } from '@angular/core';
import { LeafletMouseEvent, Layer } from 'leaflet';
import { Subscription } from 'rxjs';
import { UserPopupComponent } from '../user/user-popup/user-popup.component';
import { ObservationPopupComponent } from '../observation/observation-popup/observation-popup.component';
import { Feature } from 'geojson';
import { Feed } from '@ngageoint/mage.web-core-lib/feed';
import { FeedItemMapPopupComponent } from '../feed/feed-item/feed-item-map/feed-item-map-popup.component';
import { ObservationService } from '../observation/observation.service';
import { FilterService } from '../filter/filter.service';

@Injectable({
  providedIn: 'root'
})
export class MapPopupService {

  private observationFetch?: Subscription;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private injector: Injector,
    private applicationRef: ApplicationRef,
    private observationService: ObservationService,
    private filterService: FilterService) { }

  public registerObservation(layer: Layer, observation: any): void {
    layer.on('click', ($event: LeafletMouseEvent) => this.popupObservation($event.target, observation));
  }

  // Map features carry only what the map needs to draw them, so fetch the full
  // observation before showing its popup
  public popupObservation(layer: Layer, observation: any): void {
    const event = this.filterService.getEvent();
    if (!event) return;

    const component = this.componentFactoryResolver.resolveComponentFactory(ObservationPopupComponent).create(this.injector);
    this.applicationRef.attachView(component.hostView);
    layer
      .unbindPopup()
      .bindPopup(component.location.nativeElement)
      .openPopup();

    this.observationFetch?.unsubscribe();
    this.observationFetch = this.observationService.getObservation(event.id.toString(), observation.id).subscribe({
      next: (fetched) => component.setInput('observation', this.observationService.transformObservations(fetched, event)[0]),
      error: (err) => {
        console.error(`error fetching observation ${observation.id} for map popup`, err);
        component.setInput('failed', true);
      }
    });
  }

  public registerUser(layer: Layer, user: any): void {
    layer.on('click', ($event: LeafletMouseEvent) => this.popupUser($event.target, user));
  }

  public popupUser(layer: Layer, user: any): void {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(UserPopupComponent);
    const component = componentFactory.create(this.injector);
    component.instance.userWithLocation = user;
    this.applicationRef.attachView(component.hostView);

    layer
      .unbindPopup()
      .bindPopup(component.location.nativeElement)
      .openPopup();
  }

  public registerFeedItem(marker: Layer, feed: Feed, item: Feature): void {
    marker.on('click', ($event: LeafletMouseEvent) => this.popupFeedItem($event.target, feed, item));
  }

  public popupFeedItem(marker: Layer, feed: Feed, item: Feature): void {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(FeedItemMapPopupComponent);
    const component = componentFactory.create(this.injector);
    component.instance.item = item;
    component.instance.feed = feed;
    this.applicationRef.attachView(component.hostView);

    marker
      .unbindPopup()
      .bindPopup(component.location.nativeElement)
      .openPopup();
  }
}