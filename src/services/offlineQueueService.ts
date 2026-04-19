import { supabase } from '../lib/supabase';
import { dataService } from './dataService';

interface QueueItem {
  id?: string;
  userId: string;
  actionType: 'loan' | 'payment' | 'collection' | 'borrower';
  data: any;
  status: 'pending' | 'synced' | 'failed';
  createdAt?: Date;
}

class OfflineQueueService {
  private localStorageKey = 'penny-count-offline-queue';
  private isSyncing = false;

  // Add item to offline queue
  async addToQueue(actionType: QueueItem['actionType'], data: any, userId: string): Promise<void> {
    const queueItem: QueueItem = {
      id: this.generateId(),
      userId,
      actionType,
      data,
      status: 'pending',
      createdAt: new Date()
    };

    // Save to localStorage first (for complete offline support)
    this.saveToLocalStorage(queueItem);

    // Try to save to database if online
    if (navigator.onLine) {
      try {
        await supabase.from('offline_queue').insert({
          user_id: userId,
          action_type: actionType,
          data: data,
          status: 'pending'
        });
      } catch (error) {
      }
    }
  }

  // Save to localStorage
  private saveToLocalStorage(item: QueueItem): void {
    const queue = this.getLocalQueue();
    queue.push(item);
    localStorage.setItem(this.localStorageKey, JSON.stringify(queue));
  }

  // Get queue from localStorage
  private getLocalQueue(): QueueItem[] {
    const stored = localStorage.getItem(this.localStorageKey);
    return stored ? JSON.parse(stored) : [];
  }

  // Get pending items count
  getPendingCount(): number {
    return this.getLocalQueue().filter(item => item.status === 'pending').length;
  }

  // Get all pending items
  getPendingItems(): QueueItem[] {
    return this.getLocalQueue().filter(item => item.status === 'pending');
  }

  // Sync queue with server
  async syncQueue(userId: string): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      const queue = this.getLocalQueue();
      const pendingItems = queue.filter(item => item.status === 'pending' && item.userId === userId);

      for (const item of pendingItems) {
        try {
          await this.processQueueItem(item);
          item.status = 'synced';
          successCount++;

          // Update in database
          if (item.id) {
            await supabase
              .from('offline_queue')
              .update({ status: 'synced', synced_at: new Date().toISOString() })
              .eq('id', item.id);
          }
        } catch (error) {
          console.error('Failed to process queue item:', error);
          item.status = 'failed';
          failedCount++;

          // Update error in database
          if (item.id) {
            await supabase
              .from('offline_queue')
              .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error'
              })
              .eq('id', item.id);
          }
        }
      }

      // Update localStorage
      localStorage.setItem(this.localStorageKey, JSON.stringify(queue));

      // Clean up synced items older than 7 days
      this.cleanupOldItems();
    } finally {
      this.isSyncing = false;
    }

    return { success: successCount, failed: failedCount };
  }

  // Process a single queue item
  private async processQueueItem(item: QueueItem): Promise<void> {
    switch (item.actionType) {
      case 'borrower':
        await dataService.createBorrower(item.data);
        break;
      case 'loan':
        await dataService.createLoan(item.data);
        break;
      case 'payment':
        await dataService.recordPayment(item.data);
        break;
      case 'collection':
        await dataService.recordCollection(item.data);
        break;
      default:
        throw new Error(`Unknown action type: ${item.actionType}`);
    }
  }

  // Clean up old synced items
  private cleanupOldItems(): void {
    const queue = this.getLocalQueue();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const filtered = queue.filter(item => {
      if (item.status === 'synced' && item.createdAt) {
        return new Date(item.createdAt) > sevenDaysAgo;
      }
      return true; // Keep pending and failed items
    });

    localStorage.setItem(this.localStorageKey, JSON.stringify(filtered));
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clear all queue items (for testing)
  clearQueue(): void {
    localStorage.removeItem(this.localStorageKey);
  }

  // Get queue statistics
  getQueueStats(): { total: number; pending: number; synced: number; failed: number } {
    const queue = this.getLocalQueue();
    return {
      total: queue.length,
      pending: queue.filter(i => i.status === 'pending').length,
      synced: queue.filter(i => i.status === 'synced').length,
      failed: queue.filter(i => i.status === 'failed').length
    };
  }
}

export const offlineQueueService = new OfflineQueueService();
