import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IngressComponent } from './ingress.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Ingress Component', () => {
  let component: IngressComponent;
  let fixture: ComponentFixture<IngressComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [IngressComponent],
    imports: [],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IngressComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should go to Signin on cancel', () => {
    component.onCreated({ reason: 'cancel' });

    expect(component.ingress.state).toBe(component.IngressState.Signin);
  });

  it('should go to InactiveAccount when the account is not active', () => {
    component.onCreated({ reason: 'signup', user: { active: false, enabled: true } as any });

    expect(component.ingress.state).toBe(component.IngressState.InactiveAccount);
  });

  it('should go to DisabledAccount when the account is active but not enabled', () => {
    component.onCreated({ reason: 'signup', user: { active: true, enabled: false } as any });

    expect(component.ingress.state).toBe(component.IngressState.DisabledAccount);
  });

  it('should go to ActiveAccount when the account is active and enabled', () => {
    component.onCreated({ reason: 'signup', user: { active: true, enabled: true } as any });

    expect(component.ingress.state).toBe(component.IngressState.ActiveAccount);
  });
});
