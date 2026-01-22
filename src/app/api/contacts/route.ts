import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { customAlphabet } from 'nanoid';
import { cookies } from 'next/headers';

const generateId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

// Generate 5-digit unique company ID (Legacy function, keeping if needed elsewhere but we use nanoid now)
function generateCompanyId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export async function GET() {
  try {
    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');
    let agentPermissions: any = null;

    if (agentSession) {
      try {
        let sessionStr = agentSession.value;
        if (sessionStr.includes('%')) {
          sessionStr = decodeURIComponent(sessionStr);
        }
        const sessionData = JSON.parse(sessionStr);
        // Handle nested structure: { user: {...}, googleTokens: null }
        const agent = sessionData.user || sessionData;
        agentPermissions = agent.permissions;

        if (!agentPermissions?.contacts?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Contacts module disabled' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    // Fetch contacts with company details
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select(`
        *,
        companies (
          id,
          name,
          display_id
        ),
        contact_tag_assignments (
          contact_tags (
            name
          )
        )
      `)
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true });

    if (contactsError) throw contactsError;

    const canViewUnmasked = agentPermissions?.contacts?.includes('view_unmasked');

    // Mapping to flatten structure
    const formattedContacts = contacts.map((c: any) => {
      // Masking Logic
      let email = c.email;
      let phone = c.phone;
      let mobile = c.mobile;

      if (agentPermissions && !canViewUnmasked) {
        if (email) {
          const parts = email.split('@');
          if (parts.length === 2) {
            email = `${parts[0].substring(0, 2)}***@${parts[1]}`;
          } else {
            email = '***';
          }
        }
        if (phone) phone = `${String(phone).substring(0, 2)}******${String(phone).slice(-2)}`;
        if (mobile) mobile = `${String(mobile).substring(0, 2)}******${String(mobile).slice(-2)}`;
      }

      return {
        ...c,
        email, // Overwritten with masked if applicable
        phone,
        mobile,
        company_name: c.companies?.name,
        company_display_id: c.companies?.display_id,
        // Map nested relation to flat array of strings
        tags: c.contact_tag_assignments?.map((cta: any) => cta.contact_tags?.name).filter(Boolean) || []
      };
    });

    return NextResponse.json(formattedContacts);
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (agentSession) {
      try {
        let sessionStr = agentSession.value;
        if (sessionStr.includes('%')) {
          sessionStr = decodeURIComponent(sessionStr);
        }
        const sessionData = JSON.parse(sessionStr);
        const agent = sessionData.user || sessionData;
        const permissions = agent.permissions;

        if (!permissions?.contacts?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Contacts module disabled' }, { status: 403 });
        }
        if (!permissions?.contacts?.includes('create')) {
          return NextResponse.json({ error: 'Access Denied: No create permission' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    const {
      title,
      first_name,
      last_name,
      email,
      company_id,
      company_name,
      phone,
      mobile,
      description,
      date_of_birth,
      date_of_anniversary
    } = body;

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Deduplication Logic
    const duplicates = [];
    if (email) {
      const { data: dupEmail } = await supabase.from('contacts').select('id').eq('email', email).single();
      if (dupEmail) duplicates.push(`Email (${email})`);
    }
    if (phone) {
      const { data: dupPhone } = await supabase.from('contacts').select('id').eq('phone', phone).single();
      if (dupPhone) duplicates.push(`Phone (${phone})`);
    }
    if (mobile) {
      const { data: dupMobile } = await supabase.from('contacts').select('id').eq('mobile', mobile).single();
      if (dupMobile) duplicates.push(`Mobile (${mobile})`);
    }

    if (duplicates.length > 0) {
      return NextResponse.json(
        { error: `Duplicate detected: Contact with same ${duplicates.join(', ')} already exists.` },
        { status: 409 }
      );
    }

    let finalCompanyId = null;

    // Handle company assignment
    if (company_name && company_name.trim() !== '') {
      // Check if company exists
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, name')
        .eq('name', company_name.trim())
        .single();

      if (existingCompany) {
        finalCompanyId = existingCompany.id;
      } else {
        // Create New Company
        const newCompanyId = generateId();
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert([{
            name: company_name.trim(),
            display_id: newCompanyId
          }])
          .select('id')
          .single();

        if (createError) throw createError;
        finalCompanyId = newCompany.id;
      }
    } else if (company_id) {
      // Verify company exists
      const { data: companyCheck } = await supabase
        .from('companies')
        .select('id')
        .eq('id', company_id)
        .single();

      if (!companyCheck) {
        return NextResponse.json(
          { error: 'Invalid company_id: company not found' },
          { status: 400 }
        );
      }
      finalCompanyId = companyCheck.id;
    }

    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert([{
        title: title || null,
        first_name,
        last_name,
        email: email || null,
        company_id: finalCompanyId,
        phone: phone || null,
        mobile: mobile || null,
        description: description || null,
        date_of_birth: date_of_birth || null,
        date_of_anniversary: date_of_anniversary || null,
        display_id: generateId()
      }])
      .select('id, display_id')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, id: newContact.id, display_id: newContact.display_id }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create contact' },
      { status: 400 }
    );
  }
}