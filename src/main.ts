import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideRouter} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {routes} from './app/app.routes';
import {DatabaseService} from './app/services/database.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient()
  ]
}).then((appRef) => {
  // Expose database clearing utility to browser console for debugging
  const db = appRef.injector.get(DatabaseService);
  (window as any).clearLocalData = async () => {
    console.warn('Clearing all local data and sync queue...');
    await db.clearAllData();
    console.log('✅ Data cleared. Please refresh the page.');
  };
  console.log('💡 Run window.clearLocalData() in console to clear all offline data and sync queue');
}).catch((err) => console.error(err));
