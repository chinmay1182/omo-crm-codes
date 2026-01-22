// import { NextRequest, NextResponse } from 'next/server';

// const MSG91_API_KEY = '424608A3Z7MMnI0Q68751e0dP1'; // Hardcoded for testing

// export async function POST(req: NextRequest) {
//     try {
//         const body = await req.json();
//         const { to, message } = body;


//         const payload = {
//             integrated_number: '918810878185',
//             recipient_number: [to.replace(/\D/g, '').replace(/^\+/, '')],
//             content_type: 'text',
//             text: message
//         };


//         const response = await fetch(
//             'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/',
//             {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     authkey: MSG91_API_KEY,
//                     accept: 'application/json'
//                 },
//                 body: JSON.stringify(payload)
//             }
//         );

//         const result = await response.json();

//         if (!response.ok || result.status === 'fail') {
//             return NextResponse.json(
//                 {
//                     error: result.errors || result.message || 'Failed',
//                     details: result
//                 },
//                 { status: 400 }
//             );
//         }

//         return NextResponse.json({
//             success: true,
//             message: 'Message sent successfully!',
//             data: result
//         });
//     } catch (error: any) {
//         return NextResponse.json(
//             { error: error.message },
//             { status: 500 }
//         );
//     }
// }
