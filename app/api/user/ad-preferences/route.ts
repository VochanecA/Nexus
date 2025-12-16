// app/api/user/ad-preferences/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Preuzmi preferencije korisnika
    const { data: preferences, error } = await supabase
      .from('user_ad_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching ad preferences:', error);
      // Vrati default vrednosti ako nema sačuvanih preferencija
      return NextResponse.json({
        show_ads: true,
        max_ads: 3,
        ads_interval: 5,
        hide_ads_completely: false
      });
    }

    // Ako nema preferencija, vrati default
    if (!preferences) {
      return NextResponse.json({
        show_ads: true,
        max_ads: 3,
        ads_interval: 5,
        hide_ads_completely: false
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { show_ads, max_ads, ads_interval, hide_ads_completely } = body;

    // Validacija
    if (typeof show_ads !== 'boolean' || 
        typeof max_ads !== 'number' || 
        typeof ads_interval !== 'number' ||
        typeof hide_ads_completely !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    if (max_ads < 0 || max_ads > 20) {
      return NextResponse.json(
        { error: 'max_ads must be between 0 and 20' },
        { status: 400 }
      );
    }

    if (ads_interval < 1 || ads_interval > 20) {
      return NextResponse.json(
        { error: 'ads_interval must be between 1 and 20' },
        { status: 400 }
      );
    }

    // Upsert preferencija (insert ili update)
    const { data, error } = await supabase
      .from('user_ad_preferences')
      .upsert({
        user_id: user.id,
        show_ads,
        max_ads,
        ads_interval,
        hide_ads_completely,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving ad preferences:', error);
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      preferences: data 
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obriši preferencije (resetuj na default)
    const { error } = await supabase
      .from('user_ad_preferences')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting ad preferences:', error);
      return NextResponse.json(
        { error: 'Failed to reset preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Preferences reset to default'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}