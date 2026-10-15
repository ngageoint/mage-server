import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FeedIconModule } from '@ngageoint/mage.web-core-lib/feed/feed-icon';
import { SidebarTabComponent } from './sidebar-tab.component';


describe('SidebarTabComponent', () => {
  let component: SidebarTabComponent;
  let fixture: ComponentFixture<SidebarTabComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        MatIconModule,
        MatTooltipModule,
        FeedIconModule
      ],
      declarations: [SidebarTabComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
