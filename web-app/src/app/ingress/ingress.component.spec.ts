import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IngressComponent } from './ingress.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Ingress Component', () => {
  let component: IngressComponent;
  let fixture: ComponentFixture<IngressComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [IngressComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IngressComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
