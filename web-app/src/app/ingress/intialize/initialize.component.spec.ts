import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { InitializeComponent } from './initialize.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Initialize Component', () => {
  let component: InitializeComponent;
  let fixture: ComponentFixture<InitializeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [MatFormFieldModule,
        MatProgressBarModule, InitializeComponent],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InitializeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
