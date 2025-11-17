import { Injectable, signal, effect } from '@angular/core';
import { fromEvent, interval, merge, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';

/**
 * Monitors internet connectivity and provides connectivity status signals
 * Uses multiple strategies: online/offline events, periodic health checks, and network status
 */
@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  // Connectivity status signal
  isOnline = signal<boolean>(navigator.onLine);

  // Network connection type (if available)
  effectiveType = signal<'4g' | '3g' | '2g' | 'slow-2g' | 'unknown'>('unknown');

  // Whether we're in the middle of checking connectivity
  isChecking = signal<boolean>(false);

  private healthCheckUrl = '/health'; // Endpoint to check server connectivity
  private healthCheckInterval = 30000; // Check every 30 seconds when online

  constructor() {
    this.initializeConnectivityMonitoring();
    this.initializeNetworkInformation();
  }

  /**
   * Initialize monitoring of online/offline events
   */
  private initializeConnectivityMonitoring(): void {
    // Listen to online/offline events
    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false)),
      // Periodic health checks
      interval(this.healthCheckInterval).pipe(
        switchMap(() => this.checkServerHealth()),
        map(isHealthy => isHealthy)
      )
    )
      .pipe(
        startWith(navigator.onLine),
        debounceTime(500), // Debounce rapid changes
        distinctUntilChanged()
      )
      .subscribe(isOnline => {
        this.isOnline.set(isOnline);
      });

    // Log connectivity changes
    effect(() => {
      const online = this.isOnline();
      console.log(`[Connectivity] ${online ? 'Online' : 'Offline'}`);
    });
  }

  /**
   * Initialize Network Information API if available
   * Provides connection quality information
   */
  private initializeNetworkInformation(): void {
    const connection = (navigator as any).connection ||
                       (navigator as any).mozConnection ||
                       (navigator as any).webkitConnection;

    if (connection) {
      // Listen to connection changes
      connection.addEventListener('change', () => {
        this.effectiveType.set(connection.effectiveType || 'unknown');
      });

      // Set initial type
      this.effectiveType.set(connection.effectiveType || 'unknown');
    }
  }

  /**
   * Check if server is reachable via health endpoint
   */
  private checkServerHealth(): Observable<boolean> {
    return new Observable(observer => {
      fetch(this.healthCheckUrl, {
        method: 'GET',
        cache: 'no-cache',
        mode: 'cors'
      })
        .then(response => {
          observer.next(response.ok);
          observer.complete();
        })
        .catch(() => {
          observer.next(false);
          observer.complete();
        });
    });
  }

  /**
   * Check connectivity immediately
   */
  async checkConnectivity(): Promise<boolean> {
    this.isChecking.set(true);
    try {
      const isHealthy = await this.checkServerHealth().toPromise();
      const result = isHealthy || false;
      this.isOnline.set(result);
      return result;
    } finally {
      this.isChecking.set(false);
    }
  }

  /**
   * Get current connectivity status
   */
  getStatus(): {
    isOnline: boolean;
    effectiveType: string;
    isChecking: boolean;
  } {
    return {
      isOnline: this.isOnline(),
      effectiveType: this.effectiveType(),
      isChecking: this.isChecking()
    };
  }

  /**
   * Get an observable of connectivity changes
   */
  onConnectivityChange(): Observable<boolean> {
    return merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).pipe(
      debounceTime(500),
      distinctUntilChanged(),
      startWith(navigator.onLine)
    );
  }

  /**
   * Wait for online status
   * Useful for operations that need internet
   */
  async waitForOnline(timeoutMs: number = 60000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;

      const unsubscribe = effect(() => {
        if (this.isOnline()) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });

      timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);
    });
  }

  /**
   * Set custom health check URL
   */
  setHealthCheckUrl(url: string): void {
    this.healthCheckUrl = url;
  }

  /**
   * Set custom health check interval
   */
  setHealthCheckInterval(intervalMs: number): void {
    this.healthCheckInterval = intervalMs;
  }
}
