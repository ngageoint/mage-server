import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ExportControlComponent } from './export.component';
import { MatTooltipModule } from '@angular/material/tooltip';

describe('Export Control Component', () => {
  let component: ExportControlComponent;
  let fixture: ComponentFixture<ExportControlComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ MatIconModule, MatButtonModule, MatTooltipModule ],
      declarations: [ ExportControlComponent ]
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
