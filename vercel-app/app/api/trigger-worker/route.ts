import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface TriggerWorkerRequest {
  ruleId: string;
  reason: 'user_request' | 'scheduled' | 'conditions_good';
}

export async function POST(request: NextRequest) {
  try {
    const { ruleId, reason }: TriggerWorkerRequest = await request.json();
    
    console.log('Trigger Worker: Processing ruleId:', ruleId, 'reason:', reason);
    
    if (!ruleId) {
      return NextResponse.json({ 
        error: 'Missing ruleId parameter' 
      }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Get the alert rule to check cooldown
    const { data: alertRule, error: alertError } = await supabase
      .from('alert_rules')
      .select('created_at, last_checked_at, user_id')
      .eq('id', ruleId)
      .single();
    
    if (alertError || !alertRule) {
      console.error('Alert rule not found:', alertError);
      return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 });
    }
    
    // Calculate cooldown based on user tier and alert age
    const now = new Date();
    const createdAt = new Date(alertRule.created_at);
    const lastCheckedAt = alertRule.last_checked_at ? new Date(alertRule.last_checked_at) : null;
    
    // Determine cooldown period
    let cooldownHours = 6; // Default 6 hours
    const isNewAlert = (now.getTime() - createdAt.getTime()) < 2 * 60 * 60 * 1000; // 2 hours
    
    if (isNewAlert) {
      cooldownHours = 2; // New alerts: 2 hours from creation
    }
    // Note: Pro tier logic removed since tier column doesn't exist yet
    
    // Check if we're in cooldown
    const lastCheckTime = lastCheckedAt || createdAt;
    const cooldownUntil = new Date(lastCheckTime.getTime() + cooldownHours * 60 * 60 * 1000);
    
    if (now < cooldownUntil) {
      const remainingMinutes = Math.ceil((cooldownUntil.getTime() - now.getTime()) / (1000 * 60));
      
      console.log(`Cooldown active: ${remainingMinutes} minutes remaining`);
      
      return NextResponse.json({ 
        success: false, 
        error: 'Cooldown active',
        cooldownUntil: cooldownUntil.toISOString(),
        remainingMinutes,
        cooldownHours,
        isNewAlert
      }, { status: 429 }); // Too Many Requests
    }

    // Trigger the worker
    const triggerResult = await triggerGitHubAction(ruleId, reason);
    
    if (triggerResult.success) {
      // Update last_checked_at to start new cooldown
      await supabase
        .from('alert_rules')
        .update({ last_checked_at: now.toISOString() })
        .eq('id', ruleId);
      
      return NextResponse.json({
        success: true,
        message: 'Worker triggered successfully',
        runId: triggerResult.runId,
        estimatedTime: '2-5 minutes',
        cooldownUntil: new Date(now.getTime() + cooldownHours * 60 * 60 * 1000).toISOString(),
        cooldownHours,
        isNewAlert
      });
    } else {
      return NextResponse.json({
        success: false,
        error: triggerResult.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Trigger Worker: Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function triggerGitHubAction(ruleId: string, reason: string) {
  try {
    // For now, return a mock response
    // In production, you would call the GitHub Actions API to trigger the worker
    console.log(`Triggering worker for rule ${ruleId} due to ${reason}`);
    
    // Mock successful trigger
    return {
      success: true,
      runId: `run_${Date.now()}`,
      message: 'Worker triggered successfully'
    };
    
    // Real implementation would look like:
    /*
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/worker.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          rule_id: ruleId,
          trigger_reason: reason
        }
      })
    });
    
    if (response.ok) {
      return { success: true, runId: 'triggered' };
    } else {
      return { success: false, error: 'Failed to trigger GitHub Action' };
    }
    */
    
  } catch (error) {
    console.error('GitHub Action trigger error:', error);
    return {
      success: false,
      error: 'Failed to trigger worker'
    };
  }
}
