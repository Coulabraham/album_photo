import { NextResponse } from 'next/server';

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export function apiSuccess<T extends Record<string, unknown>>(message: string, data: T, status = 200) {
  return NextResponse.json({ success: true, message, ...data }, { status });
}
