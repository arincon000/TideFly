import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }
    
    const supabase = createClient(url, anonKey);
    // spots is in `public` schema; no need for .schema('api')
    const { data, error } = await supabase.from('spots').select('*').limit(1000);
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
