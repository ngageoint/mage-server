import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditDiscardComponent } from './observation-edit-discard.component';

describe('ObservationEditDiscardComponent', () => {
  let component: ObservationEditDiscardComponent;
  let fixture: ComponentFixture<ObservationEditDiscardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditDiscardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditDiscardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
