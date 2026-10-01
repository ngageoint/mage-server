import { TestBed } from '@angular/core/testing';
import { PollingService } from './polling.service';
import { LocalStorageService } from '../http/local-storage.service';

describe('PollingService', () => {
  let service: PollingService;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;

  function createService(savedInterval: number | null): PollingService {
    localStorageService = jasmine.createSpyObj('LocalStorageService', ['getPollingInterval', 'setPollingInterval']);
    localStorageService.getPollingInterval.and.returnValue(savedInterval);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PollingService,
        { provide: LocalStorageService, useValue: localStorageService }
      ]
    });

    return TestBed.inject(PollingService);
  }

  it('should be created', () => {
    service = createService(null);
    expect(service).toBeTruthy();
  });

  describe('initial interval', () => {
    it('defaults to 30 seconds when nothing is saved', () => {
      service = createService(null);
      expect(service.getPollingInterval()).toBe(30000);
    });

    it('defaults to 30 seconds when the saved value is zero', () => {
      service = createService(0);
      expect(service.getPollingInterval()).toBe(30000);
    });

    it('uses the saved interval when present', () => {
      service = createService(5000);
      expect(service.getPollingInterval()).toBe(5000);
    });

    it('emits the initial interval on pollingInterval$ to a new subscriber', (done) => {
      service = createService(5000);
      service.pollingInterval$.subscribe(interval => {
        expect(interval).toBe(5000);
        done();
      });
    });
  });

  describe('setPollingInterval', () => {
    beforeEach(() => {
      service = createService(30000);
    });

    it('persists the new interval to local storage', () => {
      service.setPollingInterval(120000);
      expect(localStorageService.setPollingInterval).toHaveBeenCalledWith(120000);
    });

    it('updates getPollingInterval', () => {
      service.setPollingInterval(120000);
      expect(service.getPollingInterval()).toBe(120000);
    });

    it('emits the new interval on pollingInterval$', () => {
      const emitted: number[] = [];
      service.pollingInterval$.subscribe(interval => emitted.push(interval));

      service.setPollingInterval(120000);

      expect(emitted).toEqual([30000, 120000]);
    });
  });
});
