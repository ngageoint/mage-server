import { Injectable, ComponentFactoryResolver, Injector, ApplicationRef } from '@angular/core';
import { Marker, LeafletMouseEvent } from 'leaflet';
import { UserPopupComponent } from '../user/user-popup/user-popup.component';
import { ObservationPopupComponent } from '../observation/observation-popup/observation-popup.component';

@Injectable({
  providedIn: 'root'
})
export class PopupService {

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
}