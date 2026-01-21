// app/api/contacts-by-phone/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

// Helper function to normalize phone numbers
function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').replace(/^91/, '').replace(/^0/, '').slice(-10);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ contacts: [], companies: [] });
    }

    const normalizedSearchPhone = normalizePhone(phone);

    if (normalizedSearchPhone.length < 8) {
      return NextResponse.json({ contacts: [], companies: [] });
    }

    // Get ALL contacts and companies first (Note: ideally filter in DB, but due to normalization logic we fetch wider set)
    // We can at least filter for not null phones
    const { data: allContacts, error } = await supabase
      .from('contacts')
      .select(`
        *,
        companies (
          name,
          phone
        )
      `)
      .or('phone.neq.null,mobile.neq.null');

    if (error) throw error;

    // Filter matches in JavaScript
    const matchedContacts = (allContacts || []).filter(contact => {
      // Handle Supabase join structure: companies is an object or array (single here usually)
      // Adjust for potential array response if one-to-many, but usually contact belongs to one company.
      // The select companies(name, phone) might return array if misconfigured, but assuming single for now or handling it.
      const company = Array.isArray(contact.companies) ? contact.companies[0] : contact.companies;

      const companyPhone = company?.phone;
      const companyName = company?.name;

      const contactPhones = [
        contact.phone,
        contact.mobile,
        companyPhone
      ].filter(Boolean);

      return contactPhones.some(contactPhone =>
        normalizePhone(contactPhone as string) === normalizedSearchPhone
      );
    }).map(contact => {
      // Flatten structure to match previous response
      const company = Array.isArray(contact.companies) ? contact.companies[0] : contact.companies;
      return {
        ...contact,
        company_name: company?.name,
        company_phone: company?.phone,
        companies: undefined // Remove nested object
      };
    });

    return NextResponse.json({
      contacts: matchedContacts,
      companies: []
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    return NextResponse.json({ contacts: [], companies: [] });
  }
}