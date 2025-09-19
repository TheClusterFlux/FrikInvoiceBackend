const generateHTML = (order) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  const companyInfo = {
    name: "OOSVAAL LANDBOU",
    address: "POSBUS/P.O. BOX 505\nBETHAL 2310",
    tel1: "017 647 5850/3",
    tel2: "017 647 4197",
    fax: "017 647 6058",
    regNr: "2006/03/0066/23"
  };

  const customerAddress = order.customerInfo.address;
  const deliveryAddress = order.deliveryInfo?.address || order.customerInfo.address;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bestelling / Order ${order.invoiceNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 10mm;
          color: #333;
          font-size: 8px;
          background: white;
        }
        .container {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }
        .company-logo-info {
          flex: 2;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .company-name {
          font-size: 20px;
          font-weight: bold;
          color: #000080;
          margin-bottom: 2px;
        }
        .company-logo-graphic {
          width: 80px;
          height: 20px;
          background: linear-gradient(to right, #FF0000, #000080);
          margin-bottom: 5px;
        }
        .company-contact-details {
          font-size: 9px;
          line-height: 1.3;
        }
        .order-box {
          flex: 1;
          border: 1px solid #000080;
          background-color: #000080;
          color: #fff;
          padding: 5px 10px;
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          margin-left: 10px;
          white-space: nowrap;
        }
        .order-details {
          flex: 1;
          margin-left: 10px;
          text-align: right;
          font-size: 10px;
        }
        .order-number {
          font-size: 18px;
          font-weight: bold;
          color: #FF69B4;
          margin-top: 5px;
        }
        .section-box {
          border: 1px solid #000080;
          padding: 8px;
          margin-bottom: 10px;
          min-height: 40px;
        }
        .section-label {
          font-weight: bold;
          margin-bottom: 5px;
          display: block;
        }
        .main-content {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }
        .left-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .right-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .address-box {
          border: 1px solid #000080;
          padding: 6px;
          min-height: 50px;
        }
        .input-lines {
          margin-top: 5px;
        }
        .input-line {
          border-bottom: 1px solid #000080;
          height: 15px;
          margin-bottom: 5px;
        }
        .phone-line {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .phone-icon {
          font-size: 10px;
          color: #000080;
        }
        .terms-section {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .terms-box {
          background-color: #000080;
          color: #fff;
          padding: 6px;
          text-align: center;
          font-weight: bold;
          font-size: 9px;
        }
        .signature-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .signature-box {
          border: 1px solid #000080;
          padding: 6px;
          min-height: 40px;
        }
        .signature-area {
          border: 1px solid #000080;
          height: 25px;
          margin-top: 3px;
        }
        .farm-name-section {
          border: 1px solid #000080;
          padding: 6px;
          min-height: 30px;
        }
        .codes-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .code-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .code-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .input-box {
          border: 1px solid #000080;
          height: 20px;
          width: 100%;
        }
        .table-container {
          margin-top: 15px;
          margin-bottom: 15px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
          table-layout: fixed;
        }
        .items-table th, .items-table td {
          border: 1px solid #000080;
          padding: 5px;
          text-align: left;
          vertical-align: top;
        }
        .items-table th {
          background-color: #E0E0E0;
          font-weight: bold;
          text-align: center;
          font-size: 8px;
          line-height: 1.2;
        }
        .items-table .product-code-col {
          width: 12%;
          text-align: center;
        }
        .items-table .qty-col {
          width: 10%;
          text-align: center;
        }
        .items-table .packing-col {
          width: 12%;
          text-align: center;
        }
        .items-table .description-col {
          width: 40%;
          text-align: left;
        }
        .items-table .price-col {
          width: 13%;
          text-align: right;
        }
        .items-table .total-col {
          width: 13%;
          text-align: right;
        }
        .totals-section {
          margin-top: 15px;
          margin-bottom: 15px;
          border: 1px solid #000080;
          padding: 10px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 10px;
        }
        .totals-row.total-row {
          border-top: 1px solid #000080;
          padding-top: 5px;
          margin-top: 5px;
          font-weight: bold;
          font-size: 12px;
        }
        .totals-label {
          font-weight: bold;
        }
        .totals-value {
          text-align: right;
        }
        .legal-text {
          font-size: 8px;
          text-align: center;
          margin-top: 20px;
          line-height: 1.4;
        }
        .footer-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          font-size: 9px;
        }
        .footer-signature-box {
          flex: 1;
          border: 1px solid #000080;
          padding: 8px;
          min-height: 30px;
          margin-right: 10px;
        }
        .footer-signature-box:last-child {
          margin-right: 0;
        }
        .printer-info {
          font-size: 7px;
          margin-top: 10px;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-logo-info">
            <div class="company-logo-graphic"></div>
            <div class="company-name">${companyInfo.name}</div>
            <div class="company-contact-details">
              TEL: ${companyInfo.tel1}<br>
              TEL: ${companyInfo.tel2}<br>
              FAX: ${companyInfo.fax}<br>
              ${companyInfo.address}<br>
              REG NR ${companyInfo.regNr}
            </div>
          </div>
          <div class="order-details">
            <div class="order-box">BESTELLING / ORDER</div>
            <div>No <span class="order-number">${order.invoiceNumber}</span></div>
            <div>DATUM / DATE: ${formatDate(order.createdAt)}</div>
          </div>
        </div>

        <div class="main-content">
          <div class="left-column">
            <div class="address-box">
              <span class="section-label">REKENING AAN / ACCOUNT TO:</span>
              <div class="input-lines">
                <div class="input-line"></div>
                <div class="input-line"></div>
                <div class="input-line"></div>
              </div>
            </div>
            
            <div class="terms-section">
              <div class="terms-box">TERME / TERMS (Normaal 30 dae na staat)</div>
              <div class="input-line"></div>
            </div>
            
            <div class="signature-section">
              <div class="signature-box">
                <span class="section-label">HANDTEKENING: KLIËNT / SIGNATURE: CLIENT:</span>
                <div class="signature-area"></div>
              </div>
              <div class="signature-box">
                <span class="section-label">HANDTEKENING: AGENT / SIGNATURE: AGENT:</span>
                <div class="signature-area"></div>
              </div>
            </div>
          </div>
          
          <div class="right-column">
            <div class="address-box">
              <span class="section-label">AFGELEWER AAN / DELIVERED TO:</span>
              <div class="input-lines">
                <div class="input-line"></div>
                <div class="input-line"></div>
                <div class="input-line phone-line">
                  <span class="phone-icon">📞</span>
                </div>
              </div>
            </div>
            
            <div class="farm-name-section">
              <span class="section-label">PLAASNAAM / NAME OF FARM:</span>
              <div class="input-line"></div>
            </div>
            
            <div class="codes-section">
              <div class="code-row">
                <div class="code-field">
                  <span class="section-label">VERTEENWOORDIGER NR / REPRESENTATIVE NR:</span>
                  <div class="input-box"></div>
                </div>
                <div class="code-field">
                  <span class="section-label">KLIËNT KODE / CUSTOMER CODE:</span>
                  <div class="input-box"></div>
                </div>
              </div>
              <div class="code-row">
                <div class="code-field">
                  <span class="section-label">BTW / VAT:</span>
                  <div class="input-box"></div>
                </div>
                <div class="code-field">
                  <span class="section-label">AFLEW'NGS DATUM / DELIVERY DATE:</span>
                  <div class="input-box"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="table-container">
          <table class="items-table">
            <thead>
              <tr>
                <th class="product-code-col">PRODUKKODE<br>PRODUCT CODE</th>
                <th class="qty-col">AANTAL<br>QUANTITY</th>
                <th class="packing-col">VERPAKKING<br>PACKING</th>
                <th class="description-col">BESKRYWING<br>DESCRIPTION</th>
                <th class="price-col">PRYS<br>PRICE</th>
                <th class="total-col">TOTAAL<br>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td class="product-code-col">${item.inventoryId?.sku || 'N/A'}</td>
                  <td class="qty-col">${item.quantity}</td>
                  <td class="packing-col"></td>
                  <td class="description-col">${item.name}</td>
                  <td class="price-col">${formatCurrency(item.unitPrice)}</td>
                  <td class="total-col">${formatCurrency(item.totalPrice)}</td>
                </tr>
              `).join('')}
              ${Array(Math.max(0, 10 - order.items.length)).fill('').map(() => `
                <tr>
                  <td></td><td></td><td></td><td></td><td></td><td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="totals-section">
          <div class="totals-row">
            <div class="totals-label">SUB TOTAAL / SUB TOTAL:</div>
            <div class="totals-value">${formatCurrency(order.subtotal)}</div>
          </div>
          <div class="totals-row">
            <div class="totals-label">BTW / VAT (${order.taxRate}%):</div>
            <div class="totals-value">${formatCurrency(order.taxAmount)}</div>
          </div>
          <div class="totals-row total-row">
            <div class="totals-label">TOTAAL / TOTAL:</div>
            <div class="totals-value">${formatCurrency(order.total)}</div>
          </div>
        </div>

        <div class="legal-text">
          OOSVAAL LANDBOU VERKOOP SY PRODUKTE STRENG ONDERHEWIG AAN DIE BEPALINGS EN VOORWAARDES SOOS VERVAT OP DIE KEERSY VAN HIERDIE DOKUMENT<br>
          THE SALE OF ITS PRODUCT BY OOSVAAL LANDBOU IS IN EVERY INSTANCE SUBJECT TO THE TERMS AND CONDITIONS OF SALE CONTAINED ON THE REVERSE HEREOF
        </div>

        <div class="footer-signatures">
          <div class="footer-signature-box">
            <span class="section-label">HANDTEKENING KOPER / SIGNATURE BUYER:</span>
          </div>
          <div class="footer-signature-box">
            <span class="section-label">HANDTEKENING VERTEENWOORDIGER / SIGNATURE REPRESENTATIVE:</span>
          </div>
          <div class="footer-signature-box">
            <span class="section-label">DATUM / DATE:</span>
          </div>
        </div>
        <div class="printer-info">ELPRESS DRUKKERS BK - 17380/2015</div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateHTML };
