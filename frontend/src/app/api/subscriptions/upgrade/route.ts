import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Tier configuration mapping
const TIER_CONFIG = {
  free: { event_limit: 3, price_monthly: 0, order: 0 },
  basic: { event_limit: 5, price_monthly: 29, order: 1 },
  professional: { event_limit: 20, price_monthly: 79, order: 2 },
  enterprise: { event_limit: -1, price_monthly: 199, order: 3 },
} as const;

// Validation schema
const upgradeSchema = z.object({
  target_tier: z.enum(['basic', 'professional', 'enterprise']),
});

/**
 * POST /api/subscriptions/upgrade
 * Upgrades the agency's subscription tier
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = upgradeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { target_tier } = validationResult.data;

    // Get current subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('id, tier, current_event_count')
      .eq('agency_id', user.id)
      .single();

    if (subscriptionError || !subscription) {
      console.error('Error fetching subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    const current_tier = subscription.tier as keyof typeof TIER_CONFIG;

    // Check if already at target tier
    if (current_tier === target_tier) {
      return NextResponse.json(
        {
          error: 'ALREADY_AT_TIER',
          message: `You are already on the ${target_tier} tier`,
        },
        { status: 409 }
      );
    }

    // Verify this is an upgrade (not a downgrade)
    if (TIER_CONFIG[target_tier].order <= TIER_CONFIG[current_tier].order) {
      return NextResponse.json(
        {
          error: 'INVALID_TIER_CHANGE',
          message: 'Use /downgrade endpoint to downgrade your subscription',
        },
        { status: 400 }
      );
    }

    // Get new tier configuration
    const new_config = TIER_CONFIG[target_tier];

    // Update subscription
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        tier: target_tier,
        event_limit: new_config.event_limit,
        price_monthly: new_config.price_monthly,
        billing_cycle: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        updated_at: new Date().toISOString(),
      })
      .eq('agency_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to upgrade subscription', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Subscription upgraded successfully',
      previous_tier: current_tier,
      new_tier: target_tier,
      new_event_limit: new_config.event_limit,
      price_monthly: new_config.price_monthly,
      billing_cycle: updatedSubscription.billing_cycle,
      effective_date: updatedSubscription.updated_at,
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error upgrading subscription:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
