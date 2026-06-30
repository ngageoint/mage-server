import { MomentPipe } from './moment.pipe';
import { LocalStorageService } from 'src/app/http/local-storage.service';

class MockLocalStorageService {
  getTimeFormat(): string {
    return 'relative';
  }

  getTimeZoneView(): string {
    return 'local';
  }
}

describe('MomentPipe', () => {
  it('create an instance', () => {
    const mock = new MockLocalStorageService() as unknown as LocalStorageService;
    const pipe = new MomentPipe(mock);
    expect(pipe).toBeTruthy();
  });
});
