import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LocationComponent, LocationState } from './location.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';

describe('LocationComponent', () => {
  let component: LocationComponent;
  let fixture: ComponentFixture<LocationComponent>;

  beforeEach(waitForAsync(() => {
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
    spyOn(component.stageChange, 'emit');
    component.state = LocationState.Off

    const button = fixture.debugElement.queryAll(By.css('button'))[0];
    button.nativeElement.click();

    expect(component.stageChange.emit).toHaveBeenCalledWith({
      state: LocationState.Locate
    });
  });

  it('should toggle locate off', () => {
    component.state = LocationState.Locate;

    spyOn(component.stageChange, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[0];
    button.nativeElement.click();

    expect(component.stageChange.emit).toHaveBeenCalledWith({
      state: LocationState.Off
    });
  });

  it('should toggle broadcast on', () => {
    spyOn(component.stageChange, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[1];
    button.nativeElement.click();

    expect(component.stageChange.emit).toHaveBeenCalledWith({
      state: LocationState.Broadcast
    });
  });

  it('should toggle broadcast off', () => {
    component.state = LocationState.Broadcast;

    spyOn(component.stageChange, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[1];
    button.nativeElement.click();

    expect(component.stageChange.emit).toHaveBeenCalledWith({
      state: LocationState.Locate
    });
  });

  it('should toggle locate on if broadcast is on', () => {
    spyOn(component.stageChange, 'emit');
    component.state = LocationState.Off

    const button = fixture.debugElement.queryAll(By.css('button'))[1];
    button.nativeElement.click();

    expect(component.stageChange.emit).toHaveBeenCalledWith({
      state: LocationState.Broadcast
    });
  });

  it('should toggle broadcast off if locate is off', () => {
    component.state = LocationState.Broadcast;

    spyOn(component.stageChange, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[0];
    button.nativeElement.click();

    expect(component.stageChange.emit).toHaveBeenCalledWith({
      state: LocationState.Off
    });
  });
});
