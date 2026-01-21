import { NextResponse } from "next/server";
import { supabase } from '@/app/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  // Normalize phone number → remove +91 if present
  const normalized = phone.replace(/^\+91/, "");

  // Also create version with +91 if missing
  const withPrefix = normalized.startsWith('+91') ? normalized : `+91${normalized}`;

  try {
    // Construct OR query covering raw input, normalized (no prefix), and with prefix
    // Supabase OR syntax: col.eq.val,col2.eq.val
    // We check phone vs (raw, normalized, withPrefix) and mobile vs (same)
    // Simplified: check phone and mobile columns against all variations.
    const variations = [phone, normalized, withPrefix].filter(Boolean);
    const uniqueVars = Array.from(new Set(variations));

    // It's cleaner to use .or() with explicit conditions
    // phone.in.(v1,v2),mobile.in.(v1,v2) -> But .or() logic is (A) OR (B).
    // So: phone.in.(${uniqueVars}),mobile.in.(${uniqueVars})
    // NOTE: .in() takes an array. 
    // But .or() usually requires comma separated string of conditions.
    // Let's try matching exactly one of them.
    // Actually, simpler logic:
    // .or(`phone.eq.${phone},mobile.eq.${phone},phone.eq.${normalized},mobile.eq.${normalized}`)
    // This covers most cases.

    // Constructing the OR string safely
    const conditions = [];
    uniqueVars.forEach(v => {
      conditions.push(`phone.eq.${v}`);
      conditions.push(`mobile.eq.${v}`);
    });

    // Note: Supabase query params might need encoding if they contain special chars like '+'.
    // The JS client handles this but for .or() string we should be careful.
    // However, uniqueVars values are strings.
    // If phone has spaces or special chars, direct string interpolation in .or() might be risky if not escaped?
    // Supabase JS client v2 `or` filter expects a string.
    // Safest is to just check typical formats.

    // Let's use the exact logic from previous: phone, normalized
    const queryConditions = `phone.eq.${phone},mobile.eq.${phone},phone.eq.${normalized},mobile.eq.${normalized}`;

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .or(queryConditions)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (err) {
    console.error("Error fetching contact by phone:", err);
    return NextResponse.json({ error: "Failed to fetch contact" }, { status: 500 });
  }
}
