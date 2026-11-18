import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { FeedIconComponent } from './feed-icon.component';

describe('Feed Icon Component', () => {
  let component: FeedIconComponent;
  let fixture: ComponentFixture<FeedIconComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ],
      imports: [
        MatIconModule
      ],
      declarations: [ FeedIconComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedIconComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  async function waitFor(condition: () => boolean): Promise<void> {
    for (let i = 0; i < 100 && !condition(); i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  function maskImage(): string {
    const mask: HTMLElement = fixture.nativeElement.querySelector('.icon-mask');
    return mask.style.maskImage || mask.style.webkitMaskImage;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('masks a registered icon with a blob url of its content', () => {
    fixture.componentRef.setInput('icon', { id: 'icon1' });
    fixture.detectChanges();

    httpTestingController.expectOne('/api/icons/icon1/content')
      .flush(new Blob(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], { type: 'image/svg+xml' }));
    fixture.detectChanges();

    expect(component.iconMaskImage).toMatch(/^url\(blob:/);
    expect(maskImage()).toContain('blob:');
  });

  it('revokes the blob url on destroy', () => {
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    fixture.componentRef.setInput('icon', { id: 'icon1' });
    fixture.detectChanges();
    httpTestingController.expectOne('/api/icons/icon1/content').flush(new Blob(['icon']));
    fixture.detectChanges();
    const blobUrl = component.iconMaskImage.slice('url('.length, -1);

    fixture.destroy();

    expect(revoke).toHaveBeenCalledWith(blobUrl);
  });

  it('masks a file icon with a data url of the file', async () => {
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], 'icon.svg', { type: 'image/svg+xml' });
    fixture.componentRef.setInput('icon', { file });
    fixture.detectChanges();

    await waitFor(() => component.iconMaskImage !== null);
    fixture.detectChanges();

    expect(component.iconMaskImage).toMatch(/^url\(data:image\/svg\+xml;base64,/);
    expect(maskImage()).toContain('data:image/svg+xml;base64,');
  });
});
