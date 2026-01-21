// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { supabase } from '@/app/lib/supabase';
import { setSessionCookie } from '@/app/lib/session';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();


    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Enhanced email format validation - supports any domain
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Convert email to lowercase for consistent comparison
    const normalizedEmail = email.toLowerCase().trim();

    // Get user from database using normalized email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error || !user) {
      // Don't reveal exact reason to client
      return NextResponse.json(
        { error: 'Invalid email or password. Please check your credentials.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password. Please check your credentials.' },
        { status: 401 }
      );
    }


    // Create response and set session cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      message: 'Login successful'
    });

    // Set session cookie
    setSessionCookie(response, user.id);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}