import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { ExportListComponent } from './export-list.component';
import { ExportService } from '../export.service';
import { SidebarService } from 'src/app/sidebar/sidebar.service';

describe('ExportListComponent', () => {
  let component: ExportListComponent;
  let fixture: ComponentFixture<ExportListComponent>;

  const exportService = { exports$: of([]) } as any;
  const sidebarService = jasmine.createSpyObj('SidebarService', ['viewExport']);

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ExportListComponent],
      providers: [
        { provide: ExportService, useValue: exportService },
        { provide: SidebarService, useValue: sidebarService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should emit create', () => {
    spyOn(component.create, 'emit');
    component.onCreate();
    expect(component.create.emit).toHaveBeenCalled();
  });

  it('should view an export on click', () => {
    const item = { id: '1' } as any;
    component.onClick(item);
    expect(sidebarService.viewExport).toHaveBeenCalledWith(item);
  });
});
