import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    console.log('Resetting alert cooldowns...');
    
    // Get current alerts
    const { data: alerts, error: fetchError } = await supabase
      .from('alert_rules')
      .select('id, name, cooldown_hours, last_checked_at')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching alerts:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }
    
    console.log(`Found ${alerts.length} alerts`);
    
    // Reset cooldown for all alerts
    const { data: updatedAlerts, error: updateError } = await supabase
      .from('alert_rules')
      .update({ last_checked_at: null })
      .select('id, name');
    
    if (updateError) {
      console.error('Error updating alerts:', updateError);
      return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 });
    }
    
    console.log(`✅ Updated ${updatedAlerts.length} alerts - they are now eligible for worker processing`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Reset cooldown for ${updatedAlerts.length} alerts`,
      updatedCount: updatedAlerts.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
