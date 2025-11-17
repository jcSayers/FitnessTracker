import { getSupabase } from '../config/supabase.js';
import {
  WorkoutTemplate,
  WorkoutInstance,
  ExerciseLog,
  SyncResponse,
  SyncStatus
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class SyncService {
  private supabase = getSupabase();

  /**
   * Helper: Convert date to ISO string, handling both Date objects and strings
   */
  private toISOString(date: any): string {
    if (!date) return new Date().toISOString();
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return new Date(date).toISOString();
  }

  /**
   * Helper: Sleep for a given number of milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Retry a function with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelayMs: number = 100
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
          console.log(`[resolveUserId] Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
          await this.sleep(delayMs);
        }
      }
    }
    throw lastError;
  }

  /**
   * Resolve user ID from email or UUID
   * Creates user if it doesn't exist (for email input)
   */
  async resolveUserId(userIdentifier: string): Promise<string> {
    // Check if it's already a UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(userIdentifier)) {
      console.log('[resolveUserId] UUID format detected:', userIdentifier);
      return userIdentifier;
    }

    console.log('[resolveUserId] Looking up user by email:', userIdentifier);

    try {
      // Check if user exists with this email - with retry
      let existingUsers: any[] | null = null;
      let lookupError: any = null;

      try {
        const result = await this.retryWithBackoff(async () => {
          const response = await this.supabase
            .from('users')
            .select('id, email')
            .eq('email', userIdentifier);
          if (response.error) throw response.error;
          return response;
        });
        existingUsers = result.data;
        lookupError = result.error;
      } catch (error) {
        console.error('[resolveUserId] Lookup failed after retries:', error);
        lookupError = error;
      }

      if (!lookupError && existingUsers && existingUsers.length > 0) {
        console.log('[resolveUserId] User found:', existingUsers[0].id);
        return existingUsers[0].id;
      }

      // User doesn't exist or lookup failed, create one
      console.log('[resolveUserId] Creating new user with email:', userIdentifier);
      const newUserId = uuidv4();

      let insertedUser: any[] | null = null;
      let createError: any = null;

      try {
        const result = await this.retryWithBackoff(async () => {
          const response = await this.supabase
            .from('users')
            .insert({
              id: newUserId,
              email: userIdentifier
            })
            .select('id');
          if (response.error) throw response.error;
          return response;
        });
        insertedUser = result.data;
        createError = result.error;
      } catch (error) {
        console.error('[resolveUserId] Create failed after retries:', error);
        createError = error;
      }

      if (!createError && insertedUser && insertedUser.length > 0) {
        console.log('[resolveUserId] User created successfully:', insertedUser[0].id);
        return insertedUser[0].id;
      }

      // User creation failed, try to fetch again in case it was created concurrently
      if (createError) {
        console.log('[resolveUserId] Retrying fetch after create error');
        try {
          const result = await this.retryWithBackoff(async () => {
            const response = await this.supabase
              .from('users')
              .select('id')
              .eq('email', userIdentifier);
            if (response.error) throw response.error;
            return response;
          });

          if (!result.error && result.data && result.data.length > 0) {
            console.log('[resolveUserId] User found after retry:', result.data[0].id);
            return result.data[0].id;
          }
        } catch (error) {
          console.error('[resolveUserId] Retry fetch failed:', error);
        }
      }

      throw new Error(`Failed to create or retrieve user: ${createError?.message || 'Unknown error'}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('[resolveUserId] Exception:', errorMsg);
      throw error;
    }
  }

  /**
   * Sync workout templates to Supabase
   * Returns the synced data with server-generated UUIDs for client to store as cloudId
   */
  async syncWorkoutTemplates(
    userId: string,
    templates: WorkoutTemplate[]
  ): Promise<{ success: boolean; count: number; data?: Array<{id: string; localId: string}>; error?: string }> {
    try {
      if (templates.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Map templates with IDs
      const mappings: Array<{id: string; localId: string}> = [];
      const data = templates.map(template => {
        const uuid = template.cloudId || uuidv4(); // Use cloudId if exists, otherwise generate new UUID
        mappings.push({ id: uuid, localId: template.id });

        return {
          id: uuid,
          local_id: template.id, // Store original local ID for client reference
          user_id: userId,
          name: template.name,
          description: template.description,
          exercises: JSON.stringify(template.exercises),
          estimated_duration: template.estimatedDuration,
          difficulty: template.difficulty,
          category: template.category,
          is_active: template.isActive,
          created_at: this.toISOString(template.createdAt),
          updated_at: this.toISOString(template.updatedAt)
        };
      });

      console.log('[syncWorkoutTemplates] Upserting', data.length, 'templates');

      // Upsert templates (insert or update if exists)
      const { data: upsertedData, error } = await this.supabase
        .from('workout_templates')
        .upsert(data, { onConflict: 'id' });

      if (error) {
        console.error('[syncWorkoutTemplates] Supabase error:', error);
        throw error;
      }

      console.log('[syncWorkoutTemplates] Successfully upserted', data.length, 'templates');

      return {
        success: true,
        count: templates.length,
        data: mappings
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('[syncWorkoutTemplates] Error:', errorMessage);
      return {
        success: false,
        count: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Sync workout instances to Supabase
   * Returns the synced data with server-generated UUIDs for client to store as cloudId
   */
  async syncWorkoutInstances(
    userId: string,
    instances: WorkoutInstance[]
  ): Promise<{ success: boolean; count: number; data?: Array<{id: string; localId: string}>; error?: string }> {
    try {
      if (instances.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Map instances with IDs
      const mappings: Array<{id: string; localId: string}> = [];
      const data = instances.map(instance => {
        const uuid = instance.cloudId || uuidv4(); // Use cloudId if exists, otherwise generate new UUID
        mappings.push({ id: uuid, localId: instance.id });

        return {
          id: uuid,
          local_id: instance.id, // Store original local ID for client reference
          user_id: userId,
          template_id: instance.templateId,
          template_name: instance.templateName,
          start_time: this.toISOString(instance.startTime),
          end_time: instance.endTime ? this.toISOString(instance.endTime) : undefined,
          total_duration: instance.totalDuration,
          sets: JSON.stringify(instance.sets),
          status: instance.status,
          notes: instance.notes,
          location: instance.location,
          completed_exercises: instance.completedExercises,
          total_exercises: instance.totalExercises,
          created_at: this.toISOString(instance.createdAt),
          updated_at: this.toISOString(instance.updatedAt)
        };
      });

      console.log('[syncWorkoutInstances] Upserting', data.length, 'instances');

      const { data: upsertedData, error } = await this.supabase
        .from('workout_instances')
        .upsert(data, { onConflict: 'id' });

      if (error) {
        console.error('[syncWorkoutInstances] Supabase error:', error);
        throw error;
      }

      console.log('[syncWorkoutInstances] Successfully upserted', data.length, 'instances');

      return {
        success: true,
        count: instances.length,
        data: mappings
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('[syncWorkoutInstances] Error:', errorMessage);
      return {
        success: false,
        count: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Sync exercise logs to Supabase
   * Returns the synced data with server-generated UUIDs for client to store as cloudId
   */
  async syncExerciseLogs(
    userId: string,
    logs: ExerciseLog[]
  ): Promise<{ success: boolean; count: number; data?: Array<{id: string; localId: string}>; error?: string }> {
    try {
      if (logs.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Map logs with IDs
      const mappings: Array<{id: string; localId: string}> = [];
      const data = logs.map(log => {
        const uuid = log.cloudId || uuidv4(); // Use cloudId if exists, otherwise generate new UUID
        mappings.push({ id: uuid, localId: log.id });

        return {
          id: uuid,
          local_id: log.id, // Store original local ID for client reference
          user_id: userId,
          exercise_id: log.exerciseId,
          exercise_name: log.exerciseName,
          date: this.toISOString(log.date),
          sets: JSON.stringify(log.sets),
          personal_record: log.personalRecord ? JSON.stringify(log.personalRecord) : null,
          created_at: this.toISOString(log.createdAt),
          updated_at: this.toISOString(log.updatedAt)
        };
      });

      console.log('[syncExerciseLogs] Upserting', data.length, 'logs');

      const { data: upsertedData, error } = await this.supabase
        .from('exercise_logs')
        .upsert(data, { onConflict: 'id' });

      if (error) {
        console.error('[syncExerciseLogs] Supabase error:', error);
        throw error;
      }

      console.log('[syncExerciseLogs] Successfully upserted', data.length, 'logs');

      return {
        success: true,
        count: logs.length,
        data: mappings
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('[syncExerciseLogs] Error:', errorMessage);
      return {
        success: false,
        count: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Get all data for a user from Supabase
   */
  async getUserData(userId: string): Promise<{
    templates: WorkoutTemplate[];
    instances: WorkoutInstance[];
    logs: ExerciseLog[];
  }> {
    try {
      // Fetch templates
      const { data: templatesData, error: templatesError } = await this.supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', userId);

      if (templatesError) throw templatesError;

      // Fetch instances
      const { data: instancesData, error: instancesError } = await this.supabase
        .from('workout_instances')
        .select('*')
        .eq('user_id', userId);

      if (instancesError) throw instancesError;

      // Fetch logs
      const { data: logsData, error: logsError } = await this.supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId);

      if (logsError) throw logsError;

      return {
        templates: this.transformTemplates(templatesData || []),
        instances: this.transformInstances(instancesData || []),
        logs: this.transformLogs(logsData || [])
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(
    userId: string,
    status: 'success' | 'error',
    syncedTemplates: number,
    syncedInstances: number,
    syncedLogs: number
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sync_status')
        .upsert({
          user_id: userId,
          last_sync_time: new Date().toISOString(),
          synced_templates: syncedTemplates,
          synced_instances: syncedInstances,
          synced_logs: syncedLogs,
          status: status
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  /**
   * Get last sync time for user
   */
  async getLastSyncTime(userId: string): Promise<Date | null> {
    try {
      const { data, error } = await this.supabase
        .from('sync_status')
        .select('last_sync_time')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log('No sync status found for user:', userId);
        return null;
      }

      return data?.last_sync_time ? new Date(data.last_sync_time) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Delete user data
   */
  async deleteUserData(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const tables = ['workout_templates', 'workout_instances', 'exercise_logs', 'sync_status'];

      for (const table of tables) {
        const { error } = await this.supabase
          .from(table)
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Private helper methods

  private transformTemplates(data: any[]): WorkoutTemplate[] {
    return data.map(item => ({
      id: item.local_id || item.id, // Use local_id if available, otherwise use UUID as fallback
      cloudId: item.id, // Store the UUID as cloudId for future syncs
      userId: item.user_id,
      name: item.name,
      description: item.description,
      exercises: JSON.parse(item.exercises || '[]'),
      estimatedDuration: item.estimated_duration,
      difficulty: item.difficulty,
      category: item.category,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      isActive: item.is_active
    }));
  }

  private transformInstances(data: any[]): WorkoutInstance[] {
    return data.map(item => ({
      id: item.local_id || item.id, // Use local_id if available, otherwise use UUID as fallback
      cloudId: item.id, // Store the UUID as cloudId for future syncs
      userId: item.user_id,
      templateId: item.template_id,
      templateName: item.template_name,
      startTime: new Date(item.start_time),
      endTime: item.end_time ? new Date(item.end_time) : undefined,
      totalDuration: item.total_duration,
      sets: JSON.parse(item.sets || '[]'),
      status: item.status,
      notes: item.notes,
      location: item.location,
      completedExercises: item.completed_exercises,
      totalExercises: item.total_exercises,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
  }

  private transformLogs(data: any[]): ExerciseLog[] {
    return data.map(item => ({
      id: item.local_id || item.id, // Use local_id if available, otherwise use UUID as fallback
      cloudId: item.id, // Store the UUID as cloudId for future syncs
      userId: item.user_id,
      exerciseId: item.exercise_id,
      exerciseName: item.exercise_name,
      date: new Date(item.date),
      sets: JSON.parse(item.sets || '[]'),
      personalRecord: item.personal_record ? JSON.parse(item.personal_record) : undefined,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
  }
}
