import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddObservationComponent } from './add-observation.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { By } from '@angular/platform-browser';

describe('AddObservationComponent', () => {
  let component: AddObservationComponent;
  let fixture: ComponentFixture<AddObservationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ MatIconModule, MatButtonModule ],
      declarations: [ AddObservationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddObservationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit add observation', () => {
    spyOn(component.onAddObservation, 'emit');

    const button = fixture.debugElement.query(By.css('button'));
    button.nativeElement.click();
    expect(component.onAddObservation.emit).toHaveBeenCalled();
  });
});
