import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { GuideCustomizationService } from './guide-customization.service';
import { GuideCustomizationState } from './guide-customization';

describe('Guide screenshot persistence', () => {
  let service: GuideCustomizationService;
  let http: HttpTestingController;
  const assetId = 'a'.repeat(32);
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GuideCustomizationService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('saves only image references, then hydrates saved images for reading and offline export', () => {
    const state: GuideCustomizationState = { revision: 1, overrides: { 'forms/field': {
      images: [{ assetId, dataUrl: 'data:image/png;base64,AQID', alt: 'Training', caption: 'Example', afterStep: 1 }]
    } } };
    let saved: GuideCustomizationState;
    service.save(state, '7').subscribe(result => saved = result);
    const put = http.expectOne('/api/user-guide/events/7');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.overrides['forms/field'].images[0].dataUrl).toBeUndefined();
    put.flush({ revision: 2, overrides: put.request.body.overrides });
    http.expectOne(`/api/user-guide/events/7/images/${assetId}`).flush(new Uint8Array([1, 2, 3]).buffer);
    expect(saved.revision).toBe(2);
    expect(saved.overrides['forms/field'].images[0].dataUrl).toBe('data:image/png;base64,AQID');
    expect(state.overrides['forms/field'].images[0].dataUrl).toBe('data:image/png;base64,AQID');
  });
  it('uploads images through the selected scope rather than persisting bytes as settings', () => {
    service.uploadImage('data:image/png;base64,AQID', 'global').subscribe();
    const post = http.expectOne('/api/user-guide/customizations/images');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ dataUrl: 'data:image/png;base64,AQID' });
    post.flush({ assetId, dataUrl: 'data:image/png;base64,AQID' });
  });
});
