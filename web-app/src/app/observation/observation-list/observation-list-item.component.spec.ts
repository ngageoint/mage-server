import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { mapServiceProvider } from 'src/app/upgrade/ajs-upgraded-providers';

import { ObservationListItemComponent } from './observation-list-item.component';

describe('ObservationListItemComponent', () => {
  let component: ObservationListItemComponent;
  let fixture: ComponentFixture<ObservationListItemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationListItemComponent ],
      providers: [mapServiceProvider]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
