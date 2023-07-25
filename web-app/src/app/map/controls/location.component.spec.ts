import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationComponent, LocationState } from './location.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';

describe('LocationComponent', () => {
  let component: LocationComponent;
  let fixture: ComponentFixture<LocationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [MatIconModule, MatButtonModule, MatTooltipModule],
      declarations: [ LocationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle locate on', () => {
    spyOn(component.onLocate, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[0];
    button.nativeElement.click();

    expect(component.onLocate.emit).toHaveBeenCalledWith({
      state: LocationState.ON
    });
  });

  it('should toggle locate off', () => {
    component.locateState = LocationState.ON;

    spyOn(component.onLocate, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[0];
    button.nativeElement.click();

    expect(component.onLocate.emit).toHaveBeenCalledWith({
      state: LocationState.OFF
    });
  });

  it('should toggle broadcast on', () => {
    spyOn(component.onBroadcast, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[1];
    button.nativeElement.click();

    expect(component.onBroadcast.emit).toHaveBeenCalledWith({
      state: LocationState.ON
    });
  });

  it('should toggle broadcast off', () => {
    component.broadcastState = LocationState.ON;

    spyOn(component.onBroadcast, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[1];
    button.nativeElement.click();

    expect(component.onBroadcast.emit).toHaveBeenCalledWith({
      state: LocationState.OFF
    });
  });

  it('should toggle locate on if broadcast is on', () => {
    spyOn(component.onLocate, 'emit');
    spyOn(component.onBroadcast, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[1];
    button.nativeElement.click();

    expect(component.onBroadcast.emit).toHaveBeenCalledWith({
      state: LocationState.ON
    });

    expect(component.onLocate.emit).toHaveBeenCalledWith({
      state: LocationState.ON
    });
  });

  it('should toggle broadcast off if locate is off', () => {
    component.locateState = LocationState.ON;
    component.broadcastState = LocationState.ON;

    spyOn(component.onLocate, 'emit');
    spyOn(component.onBroadcast, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[0];
    button.nativeElement.click();

    expect(component.onBroadcast.emit).toHaveBeenCalledWith({
      state: LocationState.OFF
    });

    expect(component.onLocate.emit).toHaveBeenCalledWith({
      state: LocationState.OFF
    });
  });
});
