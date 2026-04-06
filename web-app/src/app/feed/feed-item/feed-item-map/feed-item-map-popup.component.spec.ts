import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MomentModule } from 'src/app/moment/moment.module';
import { FeedItemMapPopupComponent } from './feed-item-map-popup.component';


describe('FeedItemMapPopupComponent', () => {
  let component: FeedItemMapPopupComponent;
  let fixture: ComponentFixture<FeedItemMapPopupComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        MatIconModule,
        MomentModule,
        MatListModule
      ],
      declarations: [FeedItemMapPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedItemMapPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
