import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { pruneExpiredConversations } from '@/lib/orchestration/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (!secret || !header?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const expected = createHash('sha256').update(secret).digest();
  const received = createHash('sha256').update(header.slice(7)).digest();
  if (!timingSafeEqual(expected, received)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ pruned: await pruneExpiredConversations() });
  } catch {
    return NextResponse.json({ error: 'Cleanup unavailable' }, { status: 503 });
  }
}
