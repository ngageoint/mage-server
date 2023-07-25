import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MomentModule } from 'src/app/moment/moment.module';
import { MapService } from 'src/app/upgrade/ajs-upgraded-providers';
import { FeedItemSummaryComponent } from './feed-item-summary.component';


describe('FeedItemSummaryComponent', () => {
  let component: FeedItemSummaryComponent;
  let fixture: ComponentFixture<FeedItemSummaryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MapService, useValue: {} }
      ],
      imports: [
        MatListModule,
        MatIconModule,
        MomentModule
      ],
      declarations: [ FeedItemSummaryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedItemSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
