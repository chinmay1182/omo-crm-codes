// app/api/agent-permissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const serviceType = searchParams.get("serviceType") || "whatsapp";

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    const { data: permissions, error } = await supabase
      .from('agent_permissions')
      .select('permission_type, permission_value')
      .eq('agent_id', agentId)
      .eq('service_type', serviceType);

    if (error) throw error;

    const hasAccess = Array.isArray(permissions) && permissions.length > 0;

    return NextResponse.json({
      hasAccess,
      permissions,
    });
  } catch (error) {
    console.error("Error checking agent permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
