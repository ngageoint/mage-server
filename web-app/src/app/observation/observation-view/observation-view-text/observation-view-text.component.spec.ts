import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ObservationViewTextComponent } from './observation-view-text.component';

describe('TextComponent', () => {
  let component: ObservationViewTextComponent;
  let fixture: ComponentFixture<ObservationViewTextComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationViewTextComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationViewTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
