import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LandingComponent } from './landing.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IngressModule } from '../ingress/ingress.module';
import { InfoComponent } from './info.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Landing Component', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [LandingComponent, InfoComponent, IngressModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
