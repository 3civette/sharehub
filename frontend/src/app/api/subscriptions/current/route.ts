import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Force dynamic rendering - this route uses cookies and auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/subscriptions/current
 * Returns the current subscription for the authenticated agency
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    // Query subscription for current agency
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('id, tier, status, event_limit, current_event_count, price_monthly, billing_cycle, created_at, updated_at')
      .eq('agency_id', user.id)
      .single();

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription', details: subscriptionError.message },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found for this agency' },
        { status: 404 }
      );
    }

    // Calculate usage_percent
    // If event_limit is -1 (unlimited), usage_percent is 0
    const usage_percent = subscription.event_limit === -1
      ? 0
      : Math.round((subscription.current_event_count / subscription.event_limit) * 100);

    // Calculate events_remaining
    const events_remaining = subscription.event_limit === -1
      ? -1
      : Math.max(0, subscription.event_limit - subscription.current_event_count);

    // Determine if agency can create more events
    const can_create_event = subscription.event_limit === -1
      ? true
      : subscription.current_event_count < subscription.event_limit;

    // Determine if upgrade is available (not at max tier)
    const upgrade_available = subscription.tier !== 'enterprise';

    return NextResponse.json({
      id: subscription.id,
      tier: subscription.tier,
      status: subscription.status,
      event_limit: subscription.event_limit,
      current_event_count: subscription.current_event_count,
      usage_percent,
      events_remaining,
      price_monthly: subscription.price_monthly,
      billing_cycle: subscription.billing_cycle,
      can_create_event,
      upgrade_available,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
