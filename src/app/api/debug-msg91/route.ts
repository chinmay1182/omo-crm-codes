
// import { NextResponse } from 'next/server';

// const MSG91_API_KEY = process.env.MSG91_API_KEY;
// // Use numbers from env or defaults
// const PRIMARY_NUMBER = process.env.MSG91_PRIMARY_NUMBER || '918810878185';
// const SECONDARY_NUMBER = process.env.MSG91_SECONDARY_NUMBER || '915422982253';

// export async function GET() {
//     const results = {
//         apiKeySetup: !!MSG91_API_KEY,
//         apiKeyPrefix: MSG91_API_KEY ? `${MSG91_API_KEY.substring(0, 4)}...` : 'Missing',
//         primaryNumber: PRIMARY_NUMBER,
//         secondaryNumber: SECONDARY_NUMBER,
//         checks: [] as any[]
//     };

//     try {
//         // 1. Check Primary Number Status
//         const primaryCheck = await checkNumber(PRIMARY_NUMBER);
//         results.checks.push({
//             number: PRIMARY_NUMBER,
//             label: 'Primary',
//             ...primaryCheck
//         });

//         // 2. Check Secondary Number Status
//         const secondaryCheck = await checkNumber(SECONDARY_NUMBER);
//         results.checks.push({
//             number: SECONDARY_NUMBER,
//             label: 'Secondary',
//             ...secondaryCheck
//         });

//         // 3. List Integrated Numbers (Generic check if possible, or usually we just check specific number status)
//         // There isn't a simple "list all" public API without iterating permissions sometimes, 
//         // but we can try to hit an endpoint that requires valid auth to verify the key works.
//         // The checking of specific numbers above already validates the key.

//         return NextResponse.json(results);
//     } catch (error: any) {
//         return NextResponse.json({
//             error: 'Debug execution failed',
//             details: error.message,
//             results
//         }, { status: 500 });
//     }
// }

// async function checkNumber(number: string) {
//     try {
//         // Normalize: remove + if present
//         const cleanNumber = number.replace(/\D/g, '');

//         // Using the same endpoint as checkWhatsAppNumberStatus in msg91.ts
//         // https://control.msg91.com/api/v5/whatsapp/number-status/?number=91XXXXXXXXXX
//         const url = `https://control.msg91.com/api/v5/whatsapp/number-status/?number=${cleanNumber}`;


//         const res = await fetch(url, {
//             method: 'GET',
//             headers: {
//                 'authkey': MSG91_API_KEY || '',
//                 'accept': 'application/json'
//             }
//         });

//         const data = await res.json();
//         return {
//             status: res.status,
//             ok: res.ok,
//             data
//         };
//     } catch (error: any) {
//         return {
//             error: error.message,
//             status: 'failed'
//         };
//     }
// }
