const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetCooldowns() {
  try {
    console.log('Checking current alert cooldown status...');
    
    // Get current alerts
    const { data: alerts, error: fetchError } = await supabase
      .from('alert_rules')
      .select('id, name, cooldown_hours, last_checked_at')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching alerts:', fetchError);
      return;
    }
    
    console.log('Current alert cooldown status:');
    alerts.forEach(alert => {
      console.log(`ID: ${alert.id.substring(0, 8)}... Name: ${alert.name} Cooldown: ${alert.cooldown_hours}h Last checked: ${alert.last_checked_at}`);
    });
    
    console.log(`\nFound ${alerts.length} alerts`);
    
    // Reset cooldown for all alerts
    console.log('\nResetting cooldown for all alerts...');
    const { data: updatedAlerts, error: updateError } = await supabase
      .from('alert_rules')
      .update({ last_checked_at: null })
      .select('id, name');
    
    if (updateError) {
      console.error('Error updating alerts:', updateError);
      return;
    }
    
    console.log(`✅ Updated ${updatedAlerts.length} alerts - they are now eligible for worker processing`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

resetCooldowns();
