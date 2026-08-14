import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ExportEmptyComponent } from './export-empty.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

describe('ExportEmptyComponent', () => {
  let component: ExportEmptyComponent;
  let fixture: ComponentFixture<ExportEmptyComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MatButtonModule, MatIconModule],
      declarations: [ExportEmptyComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportEmptyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should emit open', () => {
    spyOn(component.open, 'emit');
    component.openExport();
    expect(component.open.emit).toHaveBeenCalled();
  });
});
