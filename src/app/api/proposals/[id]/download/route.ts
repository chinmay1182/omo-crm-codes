import { NextResponse } from "next/server";
import { supabase } from '@/app/lib/supabase';
import { supabaseAdmin, hasAdminClient } from '@/app/lib/supabase-admin';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proposalId } = await params;

    // Use admin client if available to bypass RLS
    const client = hasAdminClient() ? supabaseAdmin! : supabase;

    // Check Agent Permissions
    const cookieStore = await cookies();
    const agentSession = cookieStore.get('agent_session');
    let agentId: string | null = null;
    let agentPermissions: any = null;

    if (agentSession) {
      try {
        const agent = JSON.parse(agentSession.value);
        agentId = agent.id;
        agentPermissions = agent.permissions;

        if (agentPermissions?.leads?.enable_disable === false) {
          return NextResponse.json({ error: 'Access Denied: Leads/Proposals module disabled' }, { status: 403 });
        }
      } catch (e) {
        console.error("Error parsing agent session", e);
      }
    }

    let query = client
      .from('proposals')
      .select(`
            *,
            leads!left (
                assigned_to,
                assignment_name,
                description,
                service,
                contacts!left (
                    first_name,
                    last_name,
                    email,
                    phone
                ),
                companies!left (
                    id,
                    name,
                    email,
                    phone,
                    registration_number,
                    address,
                    city,
                    state,
                    country,
                    postal_code
                )
            )
        `)
      .eq('id', proposalId)
      .single();

    const { data: proposalData, error } = await query;

    if (error) {
      console.error('Error fetching proposal (download):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!proposalData) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Post-fetch permission check
    if (agentPermissions) {
      const canViewAll = agentPermissions.leads?.view_all;
      const canViewAssigned = agentPermissions.leads?.view_assigned;

      if (!canViewAll) {
        if (canViewAssigned && agentId && proposalData.leads?.assigned_to === agentId) {
          // Allowed
        } else {
          return NextResponse.json({ error: 'Access Denied: You do not have permission to view this proposal' }, { status: 403 });
        }
      }
    }



    // Flatten data for template
    const lead = proposalData.leads;
    const contact = lead?.contacts;
    const company = lead?.companies;

    // Address is now stored directly in companies table
    const location = company;


    // Fetch service details to get inclusions, exclusions, and challan
    let serviceDetails: any = null;
    if (lead?.service) {


      let service: any = null;

      // Fetch all services and filter in JavaScript since contains() is not working
      const { data: allServicesData } = await client
        .from('services')
        .select('*');



      // Find service where service_names array includes the lead.service value
      if (allServicesData && allServicesData.length > 0) {
        service = allServicesData.find((s: any) =>
          s.service_names && Array.isArray(s.service_names) && s.service_names.includes(lead.service)
        );
      }

      // Try case-insensitive matching by service_name first
      if (!service) {
        let { data: serviceData, error: serviceError } = await client
          .from('services')
          .select('*')
          .ilike('service_name', lead.service)
          .limit(1);

        if (serviceError) console.log('Service lookup error:', serviceError);
        if (serviceData && serviceData.length > 0) service = serviceData[0];
      }

      // If not found, try exact match
      if (!service) {
        const result = await client
          .from('services')
          .select('*')
          .eq('service_name', lead.service)
          .limit(1);
        if (result.data && result.data.length > 0) service = result.data[0];
      }

      // If still not found, try matching by unique_service_code
      if (!service) {
        const result = await client
          .from('services')
          .select('*')
          .ilike('unique_service_code', lead.service)
          .limit(1);
        if (result.data && result.data.length > 0) service = result.data[0];
      }

      serviceDetails = service;
      if (serviceDetails) {

      }
    }

    const proposal = {
      ...proposalData,
      lead_assignment_name: lead?.assignment_name,
      lead_service: lead?.service,
      lead_description: lead?.description,
      contact_name: contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : '',
      contact_email: contact?.email,
      contact_phone: contact?.phone,
      company_name: company?.name,
      company_gstin: company?.registration_number,
      company_email: company?.email,
      company_phone: company?.phone,
      company_address: location?.address,
      company_city: location?.city,
      company_state: location?.state,
      company_country: location?.country,
      company_postal_code: location?.postal_code,
      service_inclusions: serviceDetails?.inclusions || [],
      service_exclusions: serviceDetails?.exclusions || [],
      service_challan: parseFloat(serviceDetails?.challan_associated || '0') || 0,
      service_discount: parseFloat(serviceDetails?.discount || '0') || 0
    };

    // Calculate totals
    // Assuming proposal.amount (e.g. 6860) is Grand Total (including Challan)
    // Calculate totals based on Services Table Data (Forward Calculation):
    // Standardizing with View Route

    // We store 'Total Amount' (e.g. 1770) and 'Discount' (e.g. 500) in DB.
    let proposalDiscount = Number(proposal.discount || 0); // 500
    const govtChallanAmount = proposal.service_challan || 0;

    // Get fees from service details (default to split of total if missing, but user wants service logic)
    const dbServiceFee = parseFloat(serviceDetails?.service_fee || '0');
    const dbProfessionalFee = parseFloat(serviceDetails?.professional_fee || '0');
    const dbServiceDiscount = parseFloat(serviceDetails?.discount || '0');

    // If DB has fees, use them. Else fallback to the reverse logic from stored total.
    let serviceFee = 0;
    let professionalFee = 0;
    let displayedSubtotal = 0;
    let taxableAmount = 0;
    let gstAmount = 0;
    let finalTotal = 0;

    if (dbServiceFee > 0 || dbProfessionalFee > 0) {
      serviceFee = dbServiceFee;
      professionalFee = dbProfessionalFee;
      displayedSubtotal = serviceFee + professionalFee;

      // Use Service Discount if available
      if (dbServiceDiscount > 0) {
        proposalDiscount = dbServiceDiscount;
      }

      // Taxable = Subtotal - Discount
      taxableAmount = Math.max(0, displayedSubtotal - proposalDiscount);

      // GST = 18% of Taxable
      gstAmount = Math.round(taxableAmount * 0.18);

      // Total = Taxable + GST
      finalTotal = taxableAmount + gstAmount;
    } else {
      // Fallback to Reverse Calc if Service Fees are not defined in DB
      finalTotal = parseFloat(proposal.amount ?? "0"); // 1770
      taxableAmount = Math.round(finalTotal / 1.18);
      gstAmount = Math.round(taxableAmount * 0.18);
      displayedSubtotal = taxableAmount + proposalDiscount;
      serviceFee = displayedSubtotal / 2;
      professionalFee = displayedSubtotal / 2;
    }

    const serviceDiscount = 0;
    const tableRowAmount = finalTotal;



    // Read images for embedding
    let logoUrl = 'https://crm.consolegal.com/consolegal.jpeg';
    let sealUrl = 'https://crm.consolegal.com/seal.jpeg';

    try {
      const logoPath = path.join(process.cwd(), 'public', 'consolegal.jpeg');
      const sealPath = path.join(process.cwd(), 'public', 'seal.jpeg');

      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoUrl = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
      }
      if (fs.existsSync(sealPath)) {
        const sealBuffer = fs.readFileSync(sealPath);
        sealUrl = `data:image/jpeg;base64,${sealBuffer.toString('base64')}`;
      }
    } catch (imgError) {
      console.error("Error embedding images:", imgError);
    }

    // Generate HTML
    const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ConsoLegal Proposal</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          @media print {
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }

          body {
            font-family: 'Poppins', 'Arial', sans-serif;
            color: #333;
            background: white;
            line-height: 1.6;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }

          .proposal-container {
            width: 100%;
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            padding: 10px 40px;
            display: flex;
            flex-direction: column;
          }

          .main-content {
            flex: 1;
          }

          .bottom-section {
            margin-top: 10px;
            padding-top: 10px;
          }

          /* HEADER UTILS */
          .header {
            padding: 0 0 5px 0;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .company-info {
            max-width: 50%;
          }

          .company-name {
            font-size: 24px;
            font-weight: 800;
            color: #2c3e50;
            margin-bottom: 3px;
            line-height: 1.1;
          }
          
          .company-address {
            font-size: 12px;
            color: #555;
            line-height: 1.3;
          }

          .header-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }

          .logo {
            width: 150px;
            margin-bottom: 8px;
          }

          .proposal-badge {
            background-color: #efa434;
            color: white;
            padding: 6px 24px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: inline-block;
          }

          /* CONTENT */
          .content {
            padding: 5px 0;
          }

          .section-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: #333;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }

          .info-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }

          .info-column {
            flex: 1;
          }

          .info-row {
            margin-bottom: 3px;
            font-size: 12px;
            display: flex;
          }

          .info-label {
            font-weight: 700;
            width: 130px;
            color: #333;
          }

          .info-value {
            color: #555;
            flex: 1;
          }

          /* TABLE */
          .table-container {
            margin-bottom: 10px;
          }

          .ptable {
            width: 100%;
            border-collapse: collapse;
            /* table-layout: fixed; */ /* Removed to allow natural width */
          }

          .ptable th {
            background-color: #343a40;
            color: white;
            padding: 6px 6px;
            text-align: left;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            vertical-align: middle;
            border: 1px solid #dee2e6; /* Added border */
          }

          .ptable td {
            padding: 6px 6px;
            border: 1px solid #dee2e6; /* Added full border */
            font-size: 10px;
            color: #333;
            vertical-align: top;
            word-wrap: break-word;
          }
          
          .ptable tr:nth-child(even) {
            background-color: #f8f9fa;
          }

          .ptable .text-right {
            text-align: right;
          }

          .ptable .font-bold {
            font-weight: 700;
          }
          
          .ptable .bg-gray {
            background-color: #f8f9fa;
          }

          .ptable .text-white-bg {
             background-color: #ffffff;
          }

          .ptable .text-green {
            color: #28a745;
          }

          .ptable .text-red {
            color: #dc3545;
          }

          .service-details {
            font-size: 10px;
            color: #555;
            margin-top: 3px;
          }
          .service-details strong {
            color: #333;
            font-weight: 600;
          }

          /* CALCULATION SUMMARY */
          .calculation-summary-section {
             margin-top: 10px;
             border-top: 1px dashed #ccc;
             padding-top: 15px;
          }
          .calculation-title {
             font-weight: 700;
             font-size: 13px;
             margin-bottom: 10px;
             text-transform: uppercase;
          }

          /* BANK DETAILS */
          .bank-section {
            margin-top: 0;
            border-top: 2px solid #eee;
            padding-top: 10px;
          }

          .bank-grid {
             font-size: 12px;
             line-height: 1.4;
             color: #333;
          }
          
          .bank-row strong {
             font-weight: 700;
             margin-right: 5px;
          }

          .proposal-desc-section {
            margin-top: 10px;
            font-size: 11px;
            color: #777;
            font-style: italic;
          }
          .proposal-desc-title {
            font-weight: 700;
            margin-bottom: 3px;
            text-transform: uppercase;
            font-size: 11px;
          }

          .terms {
             margin-top: 10px;
             font-size: 11px;
             color: #777;
             font-style: italic;
          }

          .signature-section {
             margin-top: 10px;
             display: flex;
             justify-content: flex-end;
             text-align: center;
          }

          .signature-box {
             display: flex;
             flex-direction: column;
             align-items: center;
          }
          
          .seal-image {
             width: 120px;
             height: auto;
             margin-bottom: 5px;
          }
          
          .signature-text {
             font-weight: 700;
             font-size: 12px;
             border-top: 1px solid #333;
             padding-top: 3px;
             width: 180px;
          }

          /* FOOTER */
          .footer {
            background-color: #efa434;
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
          }

          .footer-text {
             font-size: 12px;
             font-weight: 500;
             color: #000;
          }

          .app-badges {
             display: flex;
             gap: 8px;
          }

          .app-badges img {
             height: 30px;
          }
        </style>
      </head>
      <body>
        <div class="proposal-container">
          
          <!-- Header -->
          <div class="header">
            <div class="company-info">
              <div class="company-name">ConsoLegal<br />Private Limited</div>
              <div class="company-address">
                C 32/22, B1/3, Annapurna Nagar Colony, Vidyapeeth Road, Varanasi, U.P.-221002
              </div>
              <div style="font-size: 12px; margin-top: 5px;">
                <div style="display: flex; alignItems: center; gap: 5px; margin-bottom: 3px;">
                  <img src="https://img.icons8.com/emoji/48/e-mail.png" style="width: 14px; height: 14px;" alt="email">
                  <strong>Email:</strong> mail@consolegal.com
                </div>
                <div style="display: flex; alignItems: center; gap: 5px;">
                  <img src="https://img.icons8.com/ios/50/apple-phone.png" style="width: 14px; height: 14px;" alt="phone">
                  <strong>Phone:</strong> 0542-2982253, +91 8810878185
                </div>
              </div>
            </div>
            <div class="header-right">
              <img src="${logoUrl}" class="logo" alt="ConsoLegal" />
              <div class="proposal-badge">PROPOSAL</div>
            </div>
          </div>

          <div class="main-content">
          <div class="content">
            
            <div class="section-title">PROPOSAL TO:</div>

            <div class="info-grid">
              <div class="info-column">
                <div class="info-row">
                  <span class="info-label">Proposal Number:</span>
                  <span class="info-value">${proposal.proposal_number || "#N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Proposal Date:</span>
                  <span class="info-value">${new Date(proposal.proposal_date).toLocaleDateString("en-GB")}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Proposal Validity:</span>
                  <span class="info-value">${new Date(proposal.expiry_date).toLocaleDateString("en-GB")}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Lead Reference:</span>
                  <span class="info-value">${proposal.lead_reference_number || "N/A"}</span>
                </div>
              </div>

              <div class="info-column">
                <div class="info-row">
                  <span class="info-label">Contact Name:</span>
                  <span class="info-value">${proposal.contact_name || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Business Name:</span>
                  <span class="info-value">${proposal.company_name || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Business Address:</span>
                  <span class="info-value">
                    ${proposal.company_address
        ? proposal.company_address +
        ", " +
        proposal.company_city +
        ", " +
        proposal.company_state +
        ", " +
        proposal.company_country +
        " - " +
        proposal.company_postal_code
        : "N/A"
      }
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">Business GSTIN:</span>
                  <span class="info-value">${proposal.company_gstin || "N/A"}</span>
                </div>
              </div>
            </div>
            
            <!-- Table -->
            <div class="table-container">
              <table class="ptable">
                <thead>
                  <tr>
                    <th style="width: 20%">Lead Name</th>
                    <th style="width: 30%">Service Name</th>
                    <th style="width: 35%">Service Description</th>
                    <th style="width: 15%" class="text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${proposal.lead_assignment_name || "Legal Services"}</td>
                    <td>
                      <div>${proposal.lead_service || "-"}</div>
                      <div class="service-details">
                        <strong>Inclusion:</strong> ${proposal.service_inclusions && proposal.service_inclusions.length > 0 ? proposal.service_inclusions.join(', ') : '-'} <br/>
                        <strong>Exclusion:</strong> ${proposal.service_exclusions && proposal.service_exclusions.length > 0 ? proposal.service_exclusions.join(', ') : '-'}
                      </div>
                    </td>
                    <td>
                       <div>${proposal.lead_description || "Professional legal services as per requirement"}</div>
                    </td>
                    <td class="text-right">${tableRowAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  <!-- Calculation Summary Header -->
                  <tr class="bg-gray">
                    <td colspan="4" class="text-left font-bold" style="border: 1px solid #dee2e6; background-color: #e9ecef;">Calculation Summary</td>
                  </tr>

                  <!-- Service Fee -->
                  <tr class="bg-gray">
                    <td colspan="3" class="text-right font-bold" style="border: 1px solid #dee2e6;">Service Fee</td>
                    <td class="text-right text-green font-bold">₹${serviceFee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <!-- Professional Fee -->
                  <tr class="bg-gray">
                    <td colspan="3" class="text-right font-bold" style="border: 1px solid #dee2e6;">Professional Fee</td>
                    <td class="text-right text-green font-bold">₹${professionalFee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <!-- Discount (Proposal Discount) -->
                  ${proposalDiscount > 0 ? `
                  <tr class="bg-gray">
                    <td colspan="3" class="text-right font-bold" style="border: 1px solid #dee2e6;">Discount</td>
                    <td class="text-right text-green font-bold">-₹${proposalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  ` : ''}

                  <!-- GST -->
                  <tr class="bg-gray">
                    <td colspan="3" class="text-right font-bold" style="border: 1px solid #dee2e6;">GST@18%</td>
                    <td class="text-right text-green font-bold">₹${gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <!-- Grand Total (Fees + GST) -->
                  <tr class="bg-gray">
                    <td colspan="3" class="text-right font-bold" style="border: 1px solid #dee2e6;">Grand Total</td>
                    <td class="text-right text-red font-bold" style="font-size: 16px;">₹${tableRowAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <!-- Spacer Row -->
                  <tr style="background-color: white;">
                    <td colspan="4" style="border: 0; height: 15px;"></td>
                  </tr>

                  <!-- Other Associated Expenses Row (Restored as per request) -->
                  <tr class="bg-gray" style="background-color: #f8f9fa;">
                    <td colspan="3" class="text-right font-bold" style="border: 1px solid #dee2e6;">Other Associated Expenses</td>
                    <td class="text-right">${Number(proposal.discount) > 0 ? '₹' + Number(proposal.discount).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}</td>
                  </tr>

                  <!-- Govt Challans Row -->
                  <tr class="bg-gray" style="background-color: #f8f9fa;">
                    <td colspan="3" class="text-right font-bold" style="border: 1px solid #dee2e6;">Associated Govt Challans (if any)</td>
                    <td class="text-right">${govtChallanAmount > 0 ? govtChallanAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}</td>
                  </tr>




                </tbody>
              </table>
            </div>
          </div>


          <div class="bottom-section">
            <!-- Bank Details -->
            <div class="bank-section">
               <div class="section-title">Payment Method:</div>
               <div class="bank-grid">
                 <div class="bank-row"><strong>BANK OF BARODA, SANKAT MOCHAN, VARANASI</strong></div>
                 <div class="bank-row"><strong>A/C. HOLDER- CONSOLEGAL PRIVATE LIMITED</strong></div>
                 <div class="bank-row"><strong>A/C. NO.:</strong> 28650200000627</div>
                 <div class="bank-row"><strong>IFSC:</strong> BARB0SAMOBS (Fifth Character is Zero)</div>
                 <div class="bank-row"><strong>Proposal Validity:</strong> ${Math.ceil((new Date(proposal.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days</div>
               </div>
            </div>

            ${proposal.description ? `
            <div class="proposal-desc-section">
              <div class="proposal-desc-title">Terms and Conditions:</div>
              <p>${proposal.description}</p>
            </div>
            ` : ''}

            <div class="signature-section">
                <div class="signature-box">
                    <img src="${sealUrl}" alt="Seal" class="seal-image" />
                    <div class="signature-text">Signature & Seal</div>
                </div>
            </div>

            <div class="terms" style="text-align: right; margin-top: 5px;">
              No Manual Signature required, system generated
            </div>

           <!-- Footer -->
           <div class="footer">
             <div class="footer-text">
               Visit our Website - www.consolegal.com
             </div>
             <div class="app-badges">
                <span style="font-size: 11px; margin-right: 10px; align-self: center;">Download our App:</span>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                  alt="Get it on Google Play"
                />
                <img
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                  alt="Download on the App Store"
                />
             </div>
           </div>

        </div>
      </body>
    </html>`;

    // Launch browser and generate PDF
    let browser;
    try {
      // For production (Vercel/Lambda)
      if (process.env.NODE_ENV === 'production') {
        browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: (chromium as any).defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
      } else {
        // For development
        let executablePath = null;
        if (process.platform === 'win32') {
          const possiblePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
          ];
          for (const path of possiblePaths) {
            if (fs.existsSync(path)) {
              executablePath = path;
              break;
            }
          }
        }

        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          executablePath: executablePath || undefined
        });
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Clean up base64 log spam if any
      // await page.evaluate(() => console.clear());

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });

      await browser.close();

      // Return PDF as response
      return new NextResponse(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="proposal-${proposal.proposal_number || proposalId}.pdf"`,
        },
      });
    } catch (browserError) {
      console.error('Browser error:', browserError);
      // Fallback: redirect to view if PDF generation fails
      return NextResponse.redirect(new URL(`/api/proposals/${proposalId}/view`, request.url));
    }

  } catch (error: any) {
    console.error('Error downloading proposal:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}