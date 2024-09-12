import { LocalStorageService } from '../http/local-storage.service';
import { MomentPipe } from './moment.pipe';

class MockLocalStorageService extends LocalStorageService {
  getTimeFormat(): string {
    return 'relative';
  }
}

describe('MomentPipe', () => {
  it('create an instance', () => {
    const mock = new MockLocalStorageService();
    const pipe = new MomentPipe(mock);
    expect(pipe).toBeTruthy();
  });
});
