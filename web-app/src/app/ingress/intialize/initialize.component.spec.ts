import { TestBed, waitForAsync } from '@angular/core/testing';
import { InitializeComponent } from './initialize.component';

describe('Initialize Component', () => {
  let component: InitializeComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [InitializeComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
