interface MemoryTask {
  id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  metadata: any;
  retries: number;
  timestamp: number;
}

interface SaverCallbacks {
  onStart?: (taskId: string) => void;
  onSuccess?: (taskId: string) => void;
  onError?: (taskId: string, error: any) => void;
  onComplete?: (taskId: string, success: boolean) => void;
}

class BackgroundMemorySaver {
  private queue: MemoryTask[] = [];
  private processing = false;
  private callbacks: SaverCallbacks = {};
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  setCallbacks(callbacks: SaverCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Add memory storage task to background queue
   */
  addMemoryTask(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    metadata: any = {}
  ): string {
    const taskId = `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: MemoryTask = {
      id: taskId,
      messages,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      },
      retries: 0,
      timestamp: Date.now()
    };

    this.queue.push(task);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    
    return taskId;
  }

  /**
   * Process the memory storage queue
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await this.processTask(task);
    }

    this.processing = false;
  }

  /**
   * Process a single memory task
   */
  private async processTask(task: MemoryTask) {

    this.callbacks.onStart?.(task.id);

    try {
      const response = await fetch('/api/memory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: task.messages,
          metadata: task.metadata
        })
      });

      if (response.ok) {
        const result = await response.json();
        this.callbacks.onSuccess?.(task.id);
        this.callbacks.onComplete?.(task.id, true);
      } else {
        const errorText = await response.text();
        throw new Error(`Memory API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

    } catch (error) {
      
      // Retry logic
      if (task.retries < this.maxRetries) {
        task.retries++;
        
        // Add delay before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * task.retries));
        
        // Re-queue the task
        this.queue.unshift(task);
      } else {
        this.callbacks.onError?.(task.id, error);
        this.callbacks.onComplete?.(task.id, false);
      }
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      pendingTasks: this.queue.map(task => ({
        id: task.id,
        retries: task.retries,
        timestamp: task.timestamp
      }))
    };
  }

  /**
   * Clear the queue (for testing or reset)
   */
  clearQueue() {
    this.queue = [];
    this.processing = false;
  }
}

// Export singleton instance
export const backgroundMemorySaver = new BackgroundMemorySaver();