import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ExportListItemComponent } from './export-list-item.component';
import { SessionService } from '../../http/session.service';
import { Export, ExportStatus } from '../entities.export';
import { MomentModule } from '../../moment/moment.module';

describe('ExportListItemComponent', () => {
  let component: ExportListItemComponent;
  let fixture: ComponentFixture<ExportListItemComponent>;

  const sessionService = jasmine.createSpyObj('SessionService', ['getToken']);

  beforeEach(waitForAsync(() => {
    sessionService.getToken.and.returnValue('token');

    TestBed.configureTestingModule({
      imports: [MomentModule],
      declarations: [ExportListItemComponent],
      providers: [
        { provide: SessionService, useValue: sessionService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportListItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should compute summary start/end from the item', () => {
    const item: Export = {
      id: '1',
      exportType: 'kml',
      url: '/api/exports/mine/1',
      status: ExportStatus.Completed,
      options: {},
      summary: {
        observations: { count: 2, startTimestamp: '2020-01-01T00:00:00Z', endTimestamp: '2020-01-02T00:00:00Z' }
      }
    } as Export;
    component.item = item;
    component.ngOnChanges({});
    expect(component.summaryStart).toEqual(new Date('2020-01-01T00:00:00Z').valueOf());
    expect(component.summaryEnd).toEqual(new Date('2020-01-02T00:00:00Z').valueOf());
  });
});
