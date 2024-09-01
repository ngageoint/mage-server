import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddObservationComponent } from './add-observation.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ExportControlComponent } from './export.component';

describe('Export Control Component', () => {
  let component: ExportControlComponent;
  let fixture: ComponentFixture<ExportControlComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ MatIconModule, MatButtonModule ],
      declarations: [ AddObservationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
