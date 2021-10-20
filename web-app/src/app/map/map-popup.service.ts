import { Injectable, ComponentFactoryResolver, Injector, ApplicationRef } from '@angular/core';
import { Marker, LeafletMouseEvent } from 'leaflet';
import { UserPopupComponent } from '../user/user-popup/user-popup.component';
import { ObservationPopupComponent } from '../observation/observation-popup/observation-popup.component';
import { Feature } from 'geojson';
import { Feed } from '@ngageoint/mage.web-core-lib/feed';
import { FeedItemMapPopupComponent } from '../feed/feed-item/feed-item-map/feed-item-map-popup.component';

@Injectable({
  providedIn: 'root'
})
export class MapPopupService {

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private injector: Injector,
    private applicationRef: ApplicationRef,) { }

  public registerObservation(marker: Marker, observation: any): void {
    marker.on('click', ($event: LeafletMouseEvent) => this.popupObservation($event.target, observation));
  }

  public popupObservation(marker: Marker, observation: any): void {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(ObservationPopupComponent);
    const component = componentFactory.create(this.injector);
    component.instance.observation = observation;
    this.applicationRef.attachView(component.hostView);

    marker
      .unbindPopup()
      .bindPopup(component.location.nativeElement)
      .openPopup();
  }

  public registerUser(marker: Marker, user: any): void {
    marker.on('click', ($event: LeafletMouseEvent) => this.popupUser($event.target, user));
  }

  public popupUser(marker: Marker, user: any): void {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(UserPopupComponent);
    const component = componentFactory.create(this.injector);
    component.instance.userWithLocation = user;
    this.applicationRef.attachView(component.hostView);

    marker
      .unbindPopup()
      .bindPopup(component.location.nativeElement)
      .openPopup();
  }

  public registerFeedItem(marker: Marker, feed: Feed, item: Feature): void {
    marker.on('click', ($event: LeafletMouseEvent) => this.popupFeedItem($event.target, feed, item));
  }

  public popupFeedItem(marker: Marker, feed: Feed, item: Feature): void {
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