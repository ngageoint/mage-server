import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ObservationFavoritesComponent } from './observation-favorites.component';

describe('ObservationFavoritesComponent', () => {
  let component: ObservationFavoritesComponent;
  let fixture: ComponentFixture<ObservationFavoritesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule],
      declarations: [ObservationFavoritesComponent],
      providers: [{
        provide: MatDialogRef, useValue: {}
      }, {
        provide: MAT_DIALOG_DATA, useValue: {}
      }]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationFavoritesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
