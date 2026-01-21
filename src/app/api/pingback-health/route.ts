import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      pingbackUrl: 'https://crm.consolegal.com/api/pingback',
      services: {
        sse: 'active',
        database: 'connected',
        voip: 'ready'
      },
      version: '1.0.0',
      uptime: process.uptime(),
      headers: {
        'user-agent': req.headers.get('user-agent'),
        'x-forwarded-for': req.headers.get('x-forwarded-for'),
        'x-real-ip': req.headers.get('x-real-ip')
      }
    };

    return NextResponse.json(health, {
      headers: {
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // This endpoint can be used by Vodafone Vi MyCTS to test connectivity
  try {
    const testData = await req.json();



    return NextResponse.json({
      status: 'received',
      message: 'Health check successful',
      timestamp: new Date().toISOString(),
      receivedData: testData
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }
}