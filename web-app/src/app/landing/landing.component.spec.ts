import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LandingComponent } from './landing.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IngressModule } from '../ingress/ingress.module';
import { InfoComponent } from './info.component';

describe('Landing Component', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LandingComponent, InfoComponent],
      imports: [HttpClientTestingModule, IngressModule]
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
