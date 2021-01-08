import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationViewTextComponent } from './observation-view-text.component';

describe('TextComponent', () => {
  let component: ObservationViewTextComponent;
  let fixture: ComponentFixture<ObservationViewTextComponent>;

  beforeEach(async(() => {
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
