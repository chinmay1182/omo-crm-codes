// import { NextResponse } from 'next/server';

// export async function GET() {
//   try {
//     const API_KEY = process.env.MSG91_API_KEY;

//     if (!API_KEY) {
//       return NextResponse.json({
//         valid: false,
//         error: 'MSG91_API_KEY not found in environment variables'
//       });
//     }

//     // Test the API key by checking balance
//     const balanceUrl = `https://api.msg91.com/api/balance.php?authkey=${API_KEY}`;


//     const response = await fetch(balanceUrl);
//     const data = await response.text();



//     // Check if response indicates valid API key
//     const isValid = response.ok && !data.includes('Please provide valid auth key');

//     return NextResponse.json({
//       valid: isValid,
//       status: response.status,
//       response: data,
//       apiKey: `${API_KEY.substring(0, 8)}...`,
//       message: isValid ? 'API key is valid' : 'API key appears to be invalid'
//     });

//   } catch (error) {
//     console.error('API Key validation error:', error);
//     return NextResponse.json({
//       valid: false,
//       error: 'Failed to validate API key',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     }, { status: 500 });
//   }
// }