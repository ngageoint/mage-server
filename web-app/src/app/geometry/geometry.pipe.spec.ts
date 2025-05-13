import { LocalStorageService } from '../http/local-storage.service';
import { GeometryPipe } from './geometry.pipe';

class MockLocalStorageService extends LocalStorageService {
  getCoordinateSystemView(): string {
    return 'mgrs';
  }
}

describe('GeometryPipe', () => {
  it('create an instance', () => {
    const mock = new MockLocalStorageService();
    const pipe = new GeometryPipe(mock);
    expect(pipe).toBeTruthy();
  });
});
