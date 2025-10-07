// Activity Log Types
// Feature: 001-voglio-creare-l

export type ActorType = 'admin' | 'organizer' | 'participant' | 'system';

export type ActionType =
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'slide_uploaded'
  | 'slide_deleted'
  | 'slide_viewed'
  | 'slide_downloaded'
  | 'branding_updated'
  | 'tenant_created'
  | 'admin_login'
  | 'admin_logout';

export interface ActivityLog {
  id: string;
  tenant_id: string;
  event_id?: string | null;
  actor_type: ActorType;
  action_type: ActionType;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface CreateActivityLog {
  tenant_id: string;
  event_id?: string | null;
  actor_type: ActorType;
  action_type: ActionType;
  metadata?: Record<string, any>;
}
