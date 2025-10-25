import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProcessingProgress {
  documentId: string;
  fileName: string;
  status: string;
  percentComplete: number;
  currentStep: string;
  estimatedSecondsRemaining?: number;
  totalFields: number;
  processedFields: number;
}

export interface ProcessingComplete {
  documentId: string;
  success: boolean;
  timestamp: string;
}

export interface DashboardUpdate {
  timestamp: string;
}

export interface NotificationEvent {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityId: string | null;
  actionUrl: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection?: signalR.HubConnection;
  private connectionState = new Subject<signalR.HubConnectionState>();

  // Event subjects
  private processingProgressSubject = new Subject<ProcessingProgress>();
  private processingCompleteSubject = new Subject<ProcessingComplete>();
  private dashboardUpdateSubject = new Subject<DashboardUpdate>();
  private notificationSubject = new Subject<NotificationEvent>();

  // Public observables
  processingProgress$: Observable<ProcessingProgress> = this.processingProgressSubject.asObservable();
  processingComplete$: Observable<ProcessingComplete> = this.processingCompleteSubject.asObservable();
  dashboardUpdate$: Observable<DashboardUpdate> = this.dashboardUpdateSubject.asObservable();
  notification$: Observable<NotificationEvent> = this.notificationSubject.asObservable();
  connectionState$: Observable<signalR.HubConnectionState> = this.connectionState.asObservable();

  constructor() {}

  async startConnection(token: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR already connected');
      return;
    }

    try {
      // Get base URL by removing '/api' suffix from apiUrl
      const baseUrl = environment.apiUrl.replace('/api', '');

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${baseUrl}/hubs/document-processing`, {
          accessTokenFactory: () => token,
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Register event handlers
      this.registerEventHandlers();

      // Connection state handlers
      this.hubConnection.onclose(() => {
        console.log('SignalR connection closed');
        this.connectionState.next(signalR.HubConnectionState.Disconnected);
      });

      this.hubConnection.onreconnecting(() => {
        console.log('SignalR reconnecting...');
        this.connectionState.next(signalR.HubConnectionState.Reconnecting);
      });

      this.hubConnection.onreconnected(() => {
        console.log('SignalR reconnected');
        this.connectionState.next(signalR.HubConnectionState.Connected);
      });

      // Start connection
      await this.hubConnection.start();
      console.log('SignalR connection established');
      this.connectionState.next(signalR.HubConnectionState.Connected);
    } catch (error) {
      console.error('Error starting SignalR connection:', error);
      throw error;
    }
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = undefined;
      this.connectionState.next(signalR.HubConnectionState.Disconnected);
      console.log('SignalR connection stopped');
    }
  }

  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  getConnectionState(): signalR.HubConnectionState | undefined {
    return this.hubConnection?.state;
  }

  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    // Processing Progress
    this.hubConnection.on('ProcessingProgress', (progress: ProcessingProgress) => {
      console.log('Processing progress received:', progress);
      this.processingProgressSubject.next(progress);
    });

    // Processing Complete
    this.hubConnection.on('ProcessingComplete', (complete: ProcessingComplete) => {
      console.log('Processing complete received:', complete);
      this.processingCompleteSubject.next(complete);
    });

    // Dashboard Update
    this.hubConnection.on('DashboardUpdate', (update: DashboardUpdate) => {
      console.log('Dashboard update received:', update);
      this.dashboardUpdateSubject.next(update);
    });

    // Notification
    this.hubConnection.on('Notification', (notification: NotificationEvent) => {
      console.log('Notification received:', notification);
      this.notificationSubject.next(notification);
    });
  }
}
