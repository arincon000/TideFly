import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface CostMetrics {
  totalAlerts: number;
  activeAlerts: number;
  priceCacheEntries: number;
  recentWorkerRuns: number;
  estimatedMonthlyCost: {
    amadeus: number;
    email: number;
    total: number;
  };
  costSavings: {
    quickChecks: number;
    priceCache: number;
    total: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get basic metrics
    const alertsResult = await supabase.from('alert_rules').select('id, is_active');
    
    // Handle price_cache table gracefully (might not exist yet)
    let priceCacheResult = { data: [], error: null };
    try {
      priceCacheResult = await supabase.from('price_cache').select('id');
    } catch (error) {
      console.log('Price cache table not found, using empty data');
    }
    
    const workerRunsResult = await supabase.from('alert_events').select('id, sent_at').gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const totalAlerts = alertsResult.data?.length || 0;
    const activeAlerts = alertsResult.data?.filter(a => a.is_active).length || 0;
    const priceCacheEntries = priceCacheResult.data?.length || 0;
    const recentWorkerRuns = workerRunsResult.data?.length || 0;

    // Estimate costs (rough calculations)
    const avgAlertsPerRun = activeAlerts;
    const runsPerDay = 4; // Every 6 hours
    const runsPerMonth = runsPerDay * 30;
    
    // Without optimization: every alert would trigger Amadeus call
    const monthlyAmadeusCalls = avgAlertsPerRun * runsPerMonth;
    const monthlyEmailSends = monthlyAmadeusCalls * 0.1; // Assume 10% match rate
    
    // With optimization: only trigger when conditions are good
    const optimizedAmadeusCalls = monthlyAmadeusCalls * 0.3; // 70% reduction
    const optimizedEmailSends = monthlyEmailSends;
    
    const estimatedMonthlyCost = {
      amadeus: optimizedAmadeusCalls * 0.01, // $0.01 per Amadeus call
      email: optimizedEmailSends * 0.001,    // $0.001 per email
      total: (optimizedAmadeusCalls * 0.01) + (optimizedEmailSends * 0.001)
    };

    const costSavings = {
      quickChecks: (monthlyAmadeusCalls - optimizedAmadeusCalls) * 0.01,
      priceCache: optimizedAmadeusCalls * 0.005, // 50% reduction from cache hits
      total: ((monthlyAmadeusCalls - optimizedAmadeusCalls) * 0.01) + (optimizedAmadeusCalls * 0.005)
    };

    const metrics: CostMetrics = {
      totalAlerts,
      activeAlerts,
      priceCacheEntries,
      recentWorkerRuns,
      estimatedMonthlyCost,
      costSavings
    };

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Cost Monitoring: Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
