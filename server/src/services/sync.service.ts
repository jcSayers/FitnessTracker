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
   * Sync workout templates to Supabase
   */
  async syncWorkoutTemplates(
    userId: string,
    templates: WorkoutTemplate[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      if (templates.length === 0) {
        return { success: true, count: 0 };
      }

      const data = templates.map(template => ({
        id: template.id,
        user_id: userId,
        name: template.name,
        description: template.description,
        exercises: JSON.stringify(template.exercises),
        estimated_duration: template.estimatedDuration,
        difficulty: template.difficulty,
        category: template.category,
        is_active: template.isActive,
        created_at: template.createdAt.toISOString(),
        updated_at: template.updatedAt.toISOString()
      }));

      // Upsert templates (insert or update if exists)
      const { error } = await this.supabase
        .from('workout_templates')
        .upsert(data, { onConflict: 'id' });

      if (error) {
        throw error;
      }

      return {
        success: true,
        count: templates.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        count: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Sync workout instances to Supabase
   */
  async syncWorkoutInstances(
    userId: string,
    instances: WorkoutInstance[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      if (instances.length === 0) {
        return { success: true, count: 0 };
      }

      const data = instances.map(instance => ({
        id: instance.id,
        user_id: userId,
        template_id: instance.templateId,
        template_name: instance.templateName,
        start_time: instance.startTime.toISOString(),
        end_time: instance.endTime?.toISOString(),
        total_duration: instance.totalDuration,
        sets: JSON.stringify(instance.sets),
        status: instance.status,
        notes: instance.notes,
        location: instance.location,
        completed_exercises: instance.completedExercises,
        total_exercises: instance.totalExercises,
        created_at: instance.createdAt.toISOString(),
        updated_at: instance.updatedAt.toISOString()
      }));

      const { error } = await this.supabase
        .from('workout_instances')
        .upsert(data, { onConflict: 'id' });

      if (error) {
        throw error;
      }

      return {
        success: true,
        count: instances.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        count: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Sync exercise logs to Supabase
   */
  async syncExerciseLogs(
    userId: string,
    logs: ExerciseLog[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      if (logs.length === 0) {
        return { success: true, count: 0 };
      }

      const data = logs.map(log => ({
        id: log.id,
        user_id: userId,
        exercise_id: log.exerciseId,
        exercise_name: log.exerciseName,
        date: log.date.toISOString(),
        sets: JSON.stringify(log.sets),
        personal_record: log.personalRecord ? JSON.stringify(log.personalRecord) : null,
        created_at: log.createdAt.toISOString(),
        updated_at: log.updatedAt.toISOString()
      }));

      const { error } = await this.supabase
        .from('exercise_logs')
        .upsert(data, { onConflict: 'id' });

      if (error) {
        throw error;
      }

      return {
        success: true,
        count: logs.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
      id: item.id,
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
      id: item.id,
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
      id: item.id,
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
