// // src/app/api/voip/route.ts
// import { NextResponse } from 'next/server';

// // Mock database for call data
// const calls = new Map<string, any>();

// export async function POST(request: Request) {
//   try {
//     const { action, ...payload } = await request.json();
//     const authHeader = request.headers.get('Authorization');
    
//     if (!authHeader) {
//       return NextResponse.json(
//         { error: 'Authorization header is required' },
//         { status: 401 }
//       );
//     }

//     switch (action) {
//       case 'initiate':
//         // Mock call initiation
//         const callId = `call_${Date.now()}`;
//         calls.set(callId, {
//           id: callId,
//           status: 'ringing',
//           ...payload,
//           startTime: new Date().toISOString()
//         });
//         return NextResponse.json({
//           status: 1,
//           message: {
//             RespId: 200,
//             Response: 'success',
//             ReqId: callId
//           },
//           requestid: callId
//         });

//       case 'hold':
//       case 'resume':
//         const call = calls.get(payload.call_id);
//         if (!call) {
//           return NextResponse.json(
//             { error: 'Call not found' },
//             { status: 404 }
//           );
//         }
//         call.status = action === 'hold' ? 'on-hold' : 'active';
//         return NextResponse.json({ status: 'success' });

//       case 'conference':
//         // Mock conference call
//         return NextResponse.json({ status: 'success' });

//       case 'disconnect':
//         calls.delete(payload.call_id);
//         return NextResponse.json({ status: 'success' });

//       default:
//         return NextResponse.json(
//           { error: 'Invalid action' },
//           { status: 400 } 
//         );
//     }
//   } catch (error) {
//     console.error('VoIP API error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

