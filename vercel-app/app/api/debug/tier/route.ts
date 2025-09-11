import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Try the tier query
    const { data, error } = await supabase
      .schema('api')
      .from('v_tier_me')
      .select('*')
      .maybeSingle();

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'not_authenticated' }, { status: 401 });

    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
