// Admin types for dashboard and management screens

export interface Event {
  id: string;
  tenant_id: string;
  name: string;
  title: string;
  organizer?: string;
  date: string;
  slug: string;
  description: string | null;
  visibility: 'public' | 'private';
  status: 'draft' | 'upcoming' | 'ongoing' | 'past';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AccessToken {
  id: string;
  event_id: string;
  token: string;
  token_type: 'single' | 'group';
  expires_at: string | null;
  use_count: number;
  max_uses: number | null;
  last_used_at: string | null;
  created_at: string;
}
