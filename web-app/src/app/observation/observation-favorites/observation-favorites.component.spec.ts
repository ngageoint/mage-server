import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationFavoritesComponent } from './observation-favorites.component';

describe('ObservationFavoritesComponent', () => {
  let component: ObservationFavoritesComponent;
  let fixture: ComponentFixture<ObservationFavoritesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationFavoritesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationFavoritesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
