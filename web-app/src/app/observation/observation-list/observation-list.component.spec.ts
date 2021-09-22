import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationListComponent } from './observation-list.component';

describe('ObservationListComponent', () => {
  let component: ObservationListComponent;
  let fixture: ComponentFixture<ObservationListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
