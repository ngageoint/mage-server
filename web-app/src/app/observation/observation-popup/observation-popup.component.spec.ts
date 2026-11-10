import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationPopupComponent } from './observation-popup.component';
import { SidebarService } from '../../sidebar/sidebar.service';
import { MapService } from '../../map/map.service';
import { EventService } from '../../event/event.service';

describe('ObservationPopupComponent', () => {
  let fixture: ComponentFixture<ObservationPopupComponent>;
  let sidebarService: jasmine.SpyObj<SidebarService>;

  const observation: any = { id: 'obs1', user: { displayName: 'User One' }, properties: { timestamp: '2024-01-01T00:00:00Z', forms: [] } };

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
  }

  beforeEach(() => {
    sidebarService = jasmine.createSpyObj('SidebarService', ['viewObservation']);
    TestBed.configureTestingModule({
      imports: [ObservationPopupComponent],
      providers: [
        { provide: SidebarService, useValue: sidebarService },
        { provide: MapService, useValue: jasmine.createSpyObj('MapService', ['zoomToFeatureInLayer']) },
        { provide: EventService, useValue: jasmine.createSpyObj('EventService', { getForms: [] }) }
      ]
    });
    fixture = TestBed.createComponent(ObservationPopupComponent);
  });

  it('shows only a spinner until the observation loads', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-spinner')).not.toBeNull();
    expect(buttons()).toHaveSize(0);
  });

  it('shows only a failure message when loading fails', () => {
    fixture.componentRef.setInput('failed', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-spinner')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Unable to load observation');
    expect(buttons()).toHaveSize(0);
  });

  it('shows the observation and its actions once loaded', () => {
    fixture.componentRef.setInput('observation', observation);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-spinner')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('User One');
    expect(buttons()).toHaveSize(2);
  });

  it('opens the observation in the sidebar from the info action', () => {
    fixture.componentRef.setInput('observation', observation);
    fixture.detectChanges();

    buttons()[1].click();

    expect(sidebarService.viewObservation).toHaveBeenCalledWith(observation);
  });
});
