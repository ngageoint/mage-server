import { GeometryPipe } from './geometry.pipe';

class MockLocalStorageService {
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