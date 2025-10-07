// Event Service
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)

import { createClient } from '@supabase/supabase-js';
import {
  Event,
  EventCreateInput,
  EventUpdateInput,
  EventListParams,
  EventListResponse
} from '../models/admin';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Create a new event
 * @param tenantId Tenant UUID
 * @param adminId Admin user UUID (created_by)
 * @param input Event creation input
 * @returns Created event
 * @throws Error if validation fails or database error
 */
export async function createEvent(
  tenantId: string,
  adminId: string,
  input: EventCreateInput
): Promise<Event> {
  // Validate required fields
  if (!input.event_name || input.event_name.length === 0) {
    throw new Error('Event name is required');
  }

  if (input.event_name.length > 255) {
    throw new Error('Event name cannot exceed 255 characters');
  }

  if (!input.event_date) {
    throw new Error('Event date is required');
  }

  // Validate event_date is in the future
  const eventDate = new Date(input.event_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (eventDate < today) {
    throw new Error('Event date must be today or in the future');
  }

  // Validate description length
  if (input.description && input.description.length > 2000) {
    throw new Error('Description cannot exceed 2000 characters');
  }

  // Validate visibility
  if (!['public', 'private'].includes(input.visibility)) {
    throw new Error('Visibility must be either "public" or "private"');
  }

  // Compute status
  const status: 'active' | 'past' = eventDate >= today ? 'active' : 'past';

  // Insert event
  const { data, error } = await supabase
    .from('events')
    .insert({
      tenant_id: tenantId,
      event_name: input.event_name,
      event_date: input.event_date,
      description: input.description || null,
      visibility: input.visibility,
      created_by: adminId
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`);
  }

  // Add computed status field
  return {
    ...data,
    status
  };
}

/**
 * Update an existing event
 * @param eventId Event UUID
 * @param tenantId Tenant UUID (for authorization)
 * @param input Event update input
 * @returns Updated event
 * @throws Error if validation fails, event is past, or database error
 */
export async function updateEvent(
  eventId: string,
  tenantId: string,
  input: EventUpdateInput
): Promise<Event> {
  // Fetch current event
  const { data: currentEvent, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !currentEvent) {
    throw new Error('Event not found');
  }

  // Check if event is in the past (read-only)
  const currentEventDate = new Date(currentEvent.event_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (currentEventDate < today) {
    throw new Error('Cannot edit past events');
  }

  // Validate event_name if provided
  if (input.event_name !== undefined) {
    if (input.event_name.length === 0) {
      throw new Error('Event name cannot be empty');
    }
    if (input.event_name.length > 255) {
      throw new Error('Event name cannot exceed 255 characters');
    }
  }

  // Validate event_date if provided
  if (input.event_date !== undefined) {
    const newEventDate = new Date(input.event_date);
    if (newEventDate < today) {
      throw new Error('Event date must be today or in the future');
    }
  }

  // Validate description length if provided
  if (input.description !== undefined && input.description && input.description.length > 2000) {
    throw new Error('Description cannot exceed 2000 characters');
  }

  // Validate visibility if provided
  if (input.visibility !== undefined && !['public', 'private'].includes(input.visibility)) {
    throw new Error('Visibility must be either "public" or "private"');
  }

  // Build update object (only include fields that are provided)
  const updateData: any = {};
  if (input.event_name !== undefined) updateData.event_name = input.event_name;
  if (input.event_date !== undefined) updateData.event_date = input.event_date;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.visibility !== undefined) updateData.visibility = input.visibility;

  // Update event
  const { data, error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update event: ${error.message}`);
  }

  // Compute status
  const eventDate = new Date(data.event_date);
  const status: 'active' | 'past' = eventDate >= today ? 'active' : 'past';

  return {
    ...data,
    status
  };
}

/**
 * List events with sorting and filtering
 * @param tenantId Tenant UUID
 * @param params Query parameters (sort, filter)
 * @returns Event list with total count
 * @throws Error if invalid parameters or database error
 */
export async function listEvents(
  tenantId: string,
  params: EventListParams = {}
): Promise<EventListResponse> {
  const { sort = 'date-asc', filter = 'all' } = params;

  // Validate sort parameter
  if (!['date-asc', 'date-desc', 'created-desc'].includes(sort)) {
    throw new Error('Invalid sort parameter. Must be one of: date-asc, date-desc, created-desc');
  }

  // Validate filter parameter
  if (!['all', 'active', 'past'].includes(filter)) {
    throw new Error('Invalid filter parameter. Must be one of: all, active, past');
  }

  // Build query
  let query = supabase
    .from('events')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filter
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  if (filter === 'active') {
    query = query.gte('event_date', today);
  } else if (filter === 'past') {
    query = query.lt('event_date', today);
  }

  // Apply sort
  if (sort === 'date-asc') {
    query = query.order('event_date', { ascending: true });
  } else if (sort === 'date-desc') {
    query = query.order('event_date', { ascending: false });
  } else if (sort === 'created-desc') {
    query = query.order('created_at', { ascending: false });
  }

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list events: ${error.message}`);
  }

  // Add computed status field to each event
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const events: Event[] = (data || []).map((event: any) => {
    const eventDate = new Date(event.event_date);
    const status: 'active' | 'past' = eventDate >= todayDate ? 'active' : 'past';

    return {
      ...event,
      status
    };
  });

  return {
    events,
    total: count || 0
  };
}

/**
 * Get a single event by ID
 * @param eventId Event UUID
 * @param tenantId Tenant UUID (for authorization)
 * @returns Event
 * @throws Error if not found or database error
 */
export async function getEvent(eventId: string, tenantId: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    throw new Error('Event not found');
  }

  // Compute status
  const eventDate = new Date(data.event_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const status: 'active' | 'past' = eventDate >= today ? 'active' : 'past';

  return {
    ...data,
    status
  };
}
