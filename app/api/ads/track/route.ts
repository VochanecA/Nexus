// app/api/ads/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      promoted_post_id, 
      interaction_type, 
      explanation,
      relevance_score 
    } = body;

    // Validate input
    if (!promoted_post_id || !interaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['view', 'like', 'follow'].includes(interaction_type)) {
      return NextResponse.json(
        { error: 'Invalid interaction type' },
        { status: 400 }
      );
    }

    // Get promoted post
    const { data: promotedPost, error: fetchError } = await supabase
      .from('promoted_posts')
      .select('*')
      .eq('id', promoted_post_id)
      .single();

    if (fetchError || !promotedPost) {
      return NextResponse.json(
        { error: 'Promoted post not found' },
        { status: 404 }
      );
    }

    // Determine cost
    let cost = 0;
    switch (interaction_type) {
      case 'view':
        cost = promotedPost.bid_per_view;
        break;
      case 'like':
        cost = promotedPost.bid_per_like;
        break;
      case 'follow':
        cost = promotedPost.bid_per_follow;
        break;
    }

    // Check budget
    if (promotedPost.remaining_budget < cost) {
      // Mark campaign as completed
      await supabase
        .from('promoted_posts')
        .update({ status: 'completed' })
        .eq('id', promoted_post_id);

      return NextResponse.json(
        { error: 'Campaign budget depleted' },
        { status: 400 }
      );
    }

    // Check if already tracked (prevent duplicates)
    if (interaction_type !== 'view') {
      const { data: existing } = await supabase
        .from('ad_impressions')
        .select('id')
        .eq('promoted_post_id', promoted_post_id)
        .eq('user_id', user.id)
        .eq('interaction_type', interaction_type)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { success: true, message: 'Already tracked' }
        );
      }
    }

    // Record impression
    const { error: impressionError } = await supabase
      .from('ad_impressions')
      .insert({
        promoted_post_id,
        user_id: user.id,
        interaction_type,
        cost,
        explanation: explanation || {},
        relevance_score: relevance_score || 0
      });

    if (impressionError) {
      console.error('Error recording impression:', impressionError);
      return NextResponse.json(
        { error: 'Failed to record impression' },
        { status: 500 }
      );
    }

    // Update budget and stats
    const updates: any = {
      remaining_budget: promotedPost.remaining_budget - cost,
      total_spent: promotedPost.total_spent + cost,
      updated_at: new Date().toISOString()
    };

    if (interaction_type === 'view') {
      updates.total_views = promotedPost.total_views + 1;
    } else if (interaction_type === 'like') {
      updates.total_likes = promotedPost.total_likes + 1;
    } else if (interaction_type === 'follow') {
      updates.total_follows = promotedPost.total_follows + 1;
    }

    const { error: updateError } = await supabase
      .from('promoted_posts')
      .update(updates)
      .eq('id', promoted_post_id);

    if (updateError) {
      console.error('Error updating promoted post:', updateError);
    }

    return NextResponse.json({
      success: true,
      cost,
      remaining_budget: updates.remaining_budget
    });

  } catch (error) {
    console.error('Ad tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint za analytics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const promotedPostId = searchParams.get('promoted_post_id');

    if (!promotedPostId) {
      return NextResponse.json(
        { error: 'Missing promoted_post_id' },
        { status: 400 }
      );
    }

    // Get promoted post (only if user is the advertiser)
    const { data: promotedPost, error: fetchError } = await supabase
      .from('promoted_posts')
      .select('*')
      .eq('id', promotedPostId)
      .eq('advertiser_id', user.id)
      .single();

    if (fetchError || !promotedPost) {
      return NextResponse.json(
        { error: 'Not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get impressions
    const { data: impressions, error: impressionsError } = await supabase
      .from('ad_impressions')
      .select('*')
      .eq('promoted_post_id', promotedPostId)
      .order('created_at', { ascending: false });

    if (impressionsError) {
      console.error('Error fetching impressions:', impressionsError);
    }

    // Calculate analytics
    const views = impressions?.filter(i => i.interaction_type === 'view').length || 0;
    const likes = impressions?.filter(i => i.interaction_type === 'like').length || 0;
    const follows = impressions?.filter(i => i.interaction_type === 'follow').length || 0;

    const ctr = views > 0 ? ((likes + follows) / views * 100).toFixed(2) : '0';
    const avgRelevance = impressions && impressions.length > 0
      ? (impressions.reduce((sum, i) => sum + (i.relevance_score || 0), 0) / impressions.length).toFixed(2)
      : '0';

    return NextResponse.json({
      promotedPost,
      stats: {
        views,
        likes,
        follows,
        ctr: parseFloat(ctr),
        avgRelevance: parseFloat(avgRelevance),
        totalSpent: promotedPost.total_spent,
        remainingBudget: promotedPost.remaining_budget,
        costPerView: views > 0 ? (promotedPost.total_spent / views).toFixed(4) : '0',
        costPerEngagement: (likes + follows) > 0 
          ? (promotedPost.total_spent / (likes + follows)).toFixed(4) 
          : '0'
      },
      impressions: impressions?.slice(0, 50) // Limit to last 50
    });

  } catch (error) {
    console.error('Ad analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}