import { TestBed } from '@angular/core/testing';
import { SignalRService, ProcessingProgress, ProcessingComplete, DashboardUpdate } from './signalr.service';
import * as signalR from '@microsoft/signalr';

describe('SignalRService', () => {
  let service: SignalRService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SignalRService]
    });

    service = TestBed.inject(SignalRService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Connection Management', () => {
    it('should have observables for events', () => {
      expect(service.processingProgress$).toBeDefined();
      expect(service.processingComplete$).toBeDefined();
      expect(service.dashboardUpdate$).toBeDefined();
      expect(service.connectionState$).toBeDefined();
    });

    it('should not be connected initially', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should return undefined connection state initially', () => {
      expect(service.getConnectionState()).toBeUndefined();
    });
  });

  describe('Event Observables', () => {
    it('should emit processing progress events', (done) => {
      const mockProgress: ProcessingProgress = {
        documentId: 'doc-123',
        fileName: 'test.pdf',
        status: 'Processing',
        percentComplete: 50,
        currentStep: 'Analyzing document',
        estimatedSecondsRemaining: 30,
        totalFields: 20,
        processedFields: 10
      };

      service.processingProgress$.subscribe(progress => {
        expect(progress).toEqual(mockProgress);
        expect(progress.percentComplete).toBe(50);
        done();
      });

      // Manually trigger the subject (simulating SignalR event)
      (service as any).processingProgressSubject.next(mockProgress);
    });

    it('should emit processing complete events', (done) => {
      const mockComplete: ProcessingComplete = {
        documentId: 'doc-123',
        success: true,
        timestamp: new Date().toISOString()
      };

      service.processingComplete$.subscribe(complete => {
        expect(complete).toEqual(mockComplete);
        expect(complete.success).toBe(true);
        done();
      });

      (service as any).processingCompleteSubject.next(mockComplete);
    });

    it('should emit dashboard update events', (done) => {
      const mockUpdate: DashboardUpdate = {
        timestamp: new Date().toISOString()
      };

      service.dashboardUpdate$.subscribe(update => {
        expect(update).toEqual(mockUpdate);
        done();
      });

      (service as any).dashboardUpdateSubject.next(mockUpdate);
    });

    it('should emit connection state changes', (done) => {
      service.connectionState$.subscribe(state => {
        expect(state).toBe(signalR.HubConnectionState.Connected);
        done();
      });

      (service as any).connectionState.next(signalR.HubConnectionState.Connected);
    });
  });

  describe('Event Handling', () => {
    it('should handle multiple progress updates', (done) => {
      const progressUpdates: ProcessingProgress[] = [];
      const expectedCount = 3;

      service.processingProgress$.subscribe(progress => {
        progressUpdates.push(progress);

        if (progressUpdates.length === expectedCount) {
          expect(progressUpdates.length).toBe(3);
          expect(progressUpdates[0].percentComplete).toBe(25);
          expect(progressUpdates[1].percentComplete).toBe(50);
          expect(progressUpdates[2].percentComplete).toBe(75);
          done();
        }
      });

      // Simulate multiple progress updates
      [25, 50, 75].forEach(percent => {
        (service as any).processingProgressSubject.next({
          documentId: 'doc-123',
          fileName: 'test.pdf',
          status: 'Processing',
          percentComplete: percent,
          currentStep: `Step ${percent}%`,
          totalFields: 20,
          processedFields: Math.floor(20 * percent / 100)
        });
      });
    });

    it('should handle processing failure', (done) => {
      const mockComplete: ProcessingComplete = {
        documentId: 'doc-456',
        success: false,
        timestamp: new Date().toISOString()
      };

      service.processingComplete$.subscribe(complete => {
        expect(complete.success).toBe(false);
        done();
      });

      (service as any).processingCompleteSubject.next(mockComplete);
    });
  });

  describe('stopConnection', () => {
    it('should handle stop when no connection exists', async () => {
      await expectAsync(service.stopConnection()).toBeResolved();
    });
  });
});
