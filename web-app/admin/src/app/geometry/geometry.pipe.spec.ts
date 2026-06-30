import { GeometryPipe } from './geometry.pipe';
import { LocalStorageService } from 'src/app/http/local-storage.service';

class MockLocalStorageService {
  getCoordinateSystemView(): string {
    return 'mgrs';
  }
}

describe('GeometryPipe', () => {
  it('create an instance', () => {
    const mock = new MockLocalStorageService() as unknown as LocalStorageService;
    const pipe = new GeometryPipe(mock);
    expect(pipe).toBeTruthy();
  });
});
