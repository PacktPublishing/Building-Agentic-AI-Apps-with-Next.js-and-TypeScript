/**
 * Register API Route
 * POST /api/auth/register - Create new user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { email, password, name } = registerSchema.parse(body);
    
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        data: {
          user: data.user,
          session: data.session,
        },
        message: 'Registration successful. Please check your email to verify your account.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register' },
      { status: 500 }
    );
  }
}
