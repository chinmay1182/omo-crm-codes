import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (agentSession) {
      try {
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        const permissions = agent.permissions;

        // Check if 'services' permissions exist and include 'enable_disable'
        if (!permissions?.services?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Services module disabled' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204') return NextResponse.json([]);
      throw error;
    }

    // Parse JSON fields if they come as strings, but Supabase client usually returns JSONB as objects.
    // We ensure numeric fields are numbers.
    const servicesWithParsedData = services.map((service: any) => {
      // Helper to ensure array
      const ensureArray = (field: any) => Array.isArray(field) ? field : [];

      return {
        ...service,
        service_fee: parseFloat(service.service_fee) || 0,
        professional_fee: parseFloat(service.professional_fee) || 0,
        discount: parseFloat(service.discount) || 0,
        gst_amount: parseFloat(service.gst_amount) || 0,
        total_amount: parseFloat(service.total_amount) || 0,
        inclusions: ensureArray(service.inclusions),
        exclusions: ensureArray(service.exclusions),
        service_names: ensureArray(service.service_names),
        service_categories: ensureArray(service.service_categories)
      };
    });

    return NextResponse.json(servicesWithParsedData);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');

    if (agentSession) {
      try {
        const sessionData = JSON.parse(agentSession.value);
        const agent = sessionData.user || sessionData;
        const permissions = agent.permissions;

        if (!permissions?.services?.includes('enable_disable')) {
          return NextResponse.json({ error: 'Access Denied: Services module disabled' }, { status: 403 });
        }
        if (!permissions?.services?.includes('create')) {
          return NextResponse.json({ error: 'Access Denied: No create permission' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    const {
      unique_service_code,
      service_name,
      service_names,
      service_categories,
      service_type,
      service_tat,
      service_fee,
      professional_fee,
      discount,
      challan_associated,
      gst_amount,
      total_amount
    } = await request.json();

    // Validate required fields
    if (!unique_service_code || !service_name || !service_type || !service_tat) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if unique service code already exists
    const { data: existingService } = await supabase
      .from('services')
      .select('id')
      .eq('unique_service_code', unique_service_code)
      .single();

    if (existingService) {
      return NextResponse.json(
        { error: 'Unique service code already exists' },
        { status: 400 }
      );
    }

    // Generate system service code
    const serviceCode = `SRV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const serviceId = uuidv4();

    const { error: insertError } = await supabase
      .from('services')
      .insert([{
        id: serviceId,
        service_code: serviceCode,
        unique_service_code,
        service_name,
        service_names: service_names || [],
        service_categories: service_categories || [],
        service_type,
        service_tat,
        service_fee,
        professional_fee,
        discount: discount || 0,
        challan_associated: challan_associated || '',
        gst_amount,
        total_amount,
        inclusions: [],
        exclusions: []
      }]);

    if (insertError) throw insertError;

    return NextResponse.json(
      { message: 'Service created successfully', serviceId, serviceCode },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}