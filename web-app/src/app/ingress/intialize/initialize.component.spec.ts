import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { InitializeComponent } from './initialize.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';

describe('Initialize Component', () => {
  let component: InitializeComponent;
  let fixture: ComponentFixture<InitializeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [InitializeComponent],
      imports: [
        HttpClientTestingModule,
        MatFormFieldModule,
        MatProgressBarModule
      ]
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
