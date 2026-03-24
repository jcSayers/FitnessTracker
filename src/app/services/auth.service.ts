import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { supabase } from '../core/supabase.client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);

  // Signals
  private _user = signal<User | null>(null);
  private _session = signal<Session | null>(null);
  private _loading = signal(true);

  // Public readonly
  readonly user = this._user.asReadonly();
  readonly session = this._session.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly userId = computed(() => this._user()?.id ?? null);
  readonly userEmail = computed(() => this._user()?.email ?? null);

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Get current session on startup
    const { data } = await supabase.auth.getSession();
    this._session.set(data.session);
    this._user.set(data.session?.user ?? null);
    this._loading.set(false);

    // Listen to auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
      this._user.set(session?.user ?? null);
    });
  }

  async signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async signUp(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this._user.set(null);
    this._session.set(null);
    this.router.navigate(['/login']);
  }

  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }
}
