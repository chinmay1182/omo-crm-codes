import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { getPlatformLogo, getPlatformSeal } from '@/app/lib/branding/logo';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data: quotation, error } = await supabase
            .from('product_quotations')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !quotation) {
            return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
        }

        const products = Array.isArray(quotation.products) ? quotation.products : [];
        const discountValue = Number(quotation.discount_value || 0);
        let subtotal = 0;

        products.forEach((p: any) => {
            subtotal += (Number(p.sale_price) || 0) * (Number(p.qty) || 1);
        });

        // Calculation Logic
        let calculatedTotal = subtotal;
        let discountAmount = 0;
        if (discountValue > 0) {
            discountAmount = subtotal * (discountValue / 100);
            calculatedTotal = subtotal - discountAmount;
        }
        const grandTotal = Number(quotation.amount || 0);

        // Branding
        let logoUrl = '';
        let sealUrl = '';
        try {
            const dbLogoPath = await getPlatformLogo();
            const relativeLogoPath = dbLogoPath.startsWith('/') ? dbLogoPath.substring(1) : dbLogoPath;
            const logoPath = path.join(process.cwd(), 'public', relativeLogoPath);
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath);
                const ext = path.extname(logoPath).toLowerCase();
                const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
                logoUrl = `data:${mime};base64,${logoBuffer.toString('base64')}`;
            }

            const dbSealPath = await getPlatformSeal();
            const relativeSealPath = dbSealPath.startsWith('/') ? dbSealPath.substring(1) : dbSealPath;
            let sealPath = path.join(process.cwd(), 'public', relativeSealPath);
            if (!dbSealPath) sealPath = path.join(process.cwd(), 'public', 'seal.jpeg');

            if (fs.existsSync(sealPath)) {
                const sealBuffer = fs.readFileSync(sealPath);
                const ext = path.extname(sealPath).toLowerCase();
                const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
                sealUrl = `data:${mime};base64,${sealBuffer.toString('base64')}`;
            }
        } catch (e) { console.error('Image load error', e); }

        const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Quotation - ${quotation.quotation_id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Poppins', sans-serif; color: #333; background: white; padding: 20px; display: flex; justify-content: center; }
          .container { width: 100%; max-width: 210mm; background: white; padding: 40px; display: flex; flex-direction: column; }
          
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .company-info h1 { font-size: 24px; color: #2c3e50; margin-bottom: 5px; }
          .company-info p { font-size: 12px; color: #555; line-height: 1.4; }
          .logo-section { text-align: right; }
          .logo { height: 60px; margin-bottom: 10px; }
          .badge { background: #efa434; color: white; padding: 5px 15px; border-radius: 15px; font-size: 14px; font-weight: 600; display: inline-block; }

          .info-grid { display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 20px; margin-bottom: 30px; }
          .info-col { width: 48%; }
          .info-row { display: flex; font-size: 12px; margin-bottom: 5px; }
          .label { font-weight: 600; width: 120px; }
          .value { color: #555; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #343a40; color: white; padding: 8px; text-align: left; font-size: 12px; }
          td { padding: 8px; border: 1px solid #dee2e6; font-size: 12px; }
          .text-right { text-align: right; }

          .totals { width: 40%; margin-left: auto; margin-bottom: 30px; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
          .total-row.grand { font-size: 16px; font-weight: 700; color: #2c3e50; border-top: 2px solid #eee; padding-top: 10px; margin-top: 5px; }

          .footer { margin-top: auto; padding-top: 20px; border-top: 2px solid #eee; font-size: 12px; }
          .bank-details { margin-bottom: 20px; }
          .bank-row { margin-bottom: 3px; }
          
          .signature { text-align: right; margin-top: 30px; }
          .seal { height: 80px; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-info">
              <h1>ConsoLegal<br>Private Limited</h1>
              <p>C 32/22, B1/3, Annapurna Nagar Colony,<br>Vidyapeeth Road, Varanasi, U.P.-221002<br>
              Email: mail@consolegal.com | Phone: 8810878185</p>
            </div>
            <div class="logo-section">
              ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
              <div><span class="badge">QUOTATION</span></div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-col">
              <div class="info-row"><span class="label">Quote #:</span> <span class="value">${quotation.quotation_id}</span></div>
              <div class="info-row"><span class="label">Date:</span> <span class="value">${new Date(quotation.created_at).toLocaleDateString()}</span></div>
              <div class="info-row"><span class="label">Valid Until:</span> <span class="value">${new Date(new Date(quotation.created_at).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span></div>
            </div>
            <div class="info-col">
              <div class="info-row"><span class="label">To:</span> <span class="value">${quotation.contact_name}</span></div>
              <div class="info-row"><span class="label">Company:</span> <span class="value">${quotation.company_name}</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th class="text-right">Price</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${products.map((p: any) => `
              <tr>
                <td>${p.product_name} <br><span style="font-size:10px;color:#777">${p.description || ''}</span></td>
                <td class="text-right">₹${Number(p.sale_price).toLocaleString()}</td>
                <td class="text-right">${p.qty}</td>
                <td class="text-right">₹${(Number(p.sale_price) * Number(p.qty)).toLocaleString()}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row"><span>Subtotal</span> <span>₹${subtotal.toLocaleString()}</span></div>
            ${discountValue > 0 ? `<div class="total-row"><span style="color:green">Discount (${discountValue}%)</span> <span style="color:green">-₹${discountAmount.toLocaleString()}</span></div>` : ''}
            <div class="total-row grand"><span>Total</span> <span>₹${grandTotal.toLocaleString()}</span></div>
          </div>

          ${quotation.notes ? `
          <div style="margin-bottom: 20px;">
            <h4>Notes</h4>
            <p style="font-size:12px; color:#555;">${quotation.notes}</p>
          </div>
          ` : ''}

          <div class="footer">
            <div class="bank-details">
              <strong>Bank Details:</strong><br>
              Bank: BANK OF BARODA<br>
              Account: CONSOLEGAL PRIVATE LIMITED<br>
              A/C No: 28650200000627 | IFSC: BARB0SAMOBS
            </div>
            <div class="signature">
               ${sealUrl ? `<img src="${sealUrl}" class="seal" />` : ''}
               <p><strong>Authorized Signatory</strong></p>
            </div>
          </div>
        </div>
      </body>
    </html>
        `;

        let browser = null;
        try {
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true
            });

            const page = await browser.newPage();
            await page.setContent(html);
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
            });

            await browser.close();

            return new NextResponse(pdf, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="Quotation-${quotation.quotation_id}.pdf"`
                }
            });
        } catch (error: any) {
            if (browser) await browser.close();
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
