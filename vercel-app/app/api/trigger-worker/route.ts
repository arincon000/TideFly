import { NextRequest, NextResponse } from 'next/server';

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

    // For now, we'll trigger the worker by calling the GitHub Actions API
    // In a production system, you might want to use a queue system like Redis
    const triggerResult = await triggerGitHubAction(ruleId, reason);
    
    if (triggerResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Worker triggered successfully',
        runId: triggerResult.runId,
        estimatedTime: '2-5 minutes'
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
