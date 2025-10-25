import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'Info' | 'Success' | 'Warning' | 'Error' | 'DocumentProcessing' | 'Subscription' | 'Security';
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private hubConnection?: signalR.HubConnection;

  // Signals for reactive state
  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);
  isConnected = signal<boolean>(false);

  constructor() {
    // Initialize SignalR connection when user is authenticated
    if (this.authService.isAuthenticated()) {
      this.initializeSignalR();
      this.loadNotifications();
    }

    // Watch for auth state changes using effect
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth && !this.isConnected()) {
        this.initializeSignalR();
        this.loadNotifications();
      } else if (!isAuth && this.isConnected()) {
        this.disconnectSignalR();
      }
    });
  }

  /**
   * Initialize SignalR connection for real-time notifications
   */
  private async initializeSignalR(): Promise<void> {
    const token = this.authService.getToken();
    if (!token) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/document-processing`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    // Listen for notification events
    this.hubConnection.on('Notification', (notification: Notification) => {
      console.log('Received notification:', notification);
      this.notifications.update(current => [notification, ...current]);
      this.unreadCount.update(count => count + 1);

      // Show toast notification
      this.showToast(notification);
    });

    try {
      await this.hubConnection.start();
      this.isConnected.set(true);
      console.log('SignalR connected for notifications');
    } catch (err) {
      console.error('SignalR connection error:', err);
      this.isConnected.set(false);
    }
  }

  /**
   * Disconnect SignalR connection
   */
  private async disconnectSignalR(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.isConnected.set(false);
      this.notifications.set([]);
      this.unreadCount.set(0);
    }
  }

  /**
   * Load notifications from backend
   */
  async loadNotifications(limit: number = 50): Promise<void> {
    try {
      const notifications = await this.http
        .get<Notification[]>(`${environment.apiUrl}/notifications?limit=${limit}`)
        .toPromise();

      if (notifications) {
        this.notifications.set(notifications);
        this.unreadCount.set(notifications.filter(n => !n.isRead).length);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  /**
   * Get unread count from backend
   */
  async loadUnreadCount(): Promise<void> {
    try {
      const response = await this.http
        .get<{ unreadCount: number }>(`${environment.apiUrl}/notifications/unread-count`)
        .toPromise();

      if (response) {
        this.unreadCount.set(response.unreadCount);
      }
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await this.http
        .post(`${environment.apiUrl}/notifications/${notificationId}/read`, {})
        .toPromise();

      // Update local state
      this.notifications.update(current =>
        current.map(n =>
          n.id === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      this.unreadCount.update(count => Math.max(0, count - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await this.http
        .post(`${environment.apiUrl}/notifications/mark-all-read`, {})
        .toPromise();

      // Update local state
      this.notifications.update(current =>
        current.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      this.unreadCount.set(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await this.http
        .delete(`${environment.apiUrl}/notifications/${notificationId}`)
        .toPromise();

      // Update local state
      const notification = this.notifications().find(n => n.id === notificationId);
      this.notifications.update(current => current.filter(n => n.id !== notificationId));

      if (notification && !notification.isRead) {
        this.unreadCount.update(count => Math.max(0, count - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    try {
      await this.http
        .delete(`${environment.apiUrl}/notifications/clear-all`)
        .toPromise();

      // Update local state
      this.notifications.set([]);
      this.unreadCount.set(0);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  }

  /**
   * Show toast notification
   */
  private showToast(notification: Notification): void {
    // This will be implemented with a toast service
    // For now, we'll just log it
    console.log(`Toast: ${notification.title} - ${notification.message}`);
  }

  /**
   * Get notification type color class
   */
  getTypeColorClass(type: string): string {
    const colorMap: Record<string, string> = {
      'Info': 'bg-blue-500',
      'Success': 'bg-green-500',
      'Warning': 'bg-yellow-500',
      'Error': 'bg-red-500',
      'DocumentProcessing': 'bg-purple-500',
      'Subscription': 'bg-indigo-500',
      'Security': 'bg-orange-500'
    };
    return colorMap[type] || 'bg-gray-500';
  }

  /**
   * Get notification type icon
   */
  getTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'Info': 'ℹ️',
      'Success': '✅',
      'Warning': '⚠️',
      'Error': '❌',
      'DocumentProcessing': '📄',
      'Subscription': '💳',
      'Security': '🔒'
    };
    return iconMap[type] || 'ℹ️';
  }
}
