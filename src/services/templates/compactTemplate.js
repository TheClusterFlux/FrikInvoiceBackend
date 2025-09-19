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
          padding: 15px;
          color: #333;
          font-size: 10px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          border-bottom: 1px solid #333;
          padding-bottom: 15px;
        }
        .company-info {
          flex: 2;
        }
        .company-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000080;
        }
        .company-details {
          font-size: 9px;
          line-height: 1.3;
        }
        .order-info {
          flex: 1;
          text-align: right;
        }
        .order-title {
          font-size: 12px;
          font-weight: bold;
          background-color: #000080;
          color: white;
          padding: 5px;
          margin-bottom: 5px;
        }
        .order-number {
          font-size: 14px;
          font-weight: bold;
          color: #FF69B4;
          margin-bottom: 3px;
        }
        .order-date {
          font-size: 10px;
          color: #666;
        }
        .main-content {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }
        .left-column, .right-column {
          flex: 1;
        }
        .section-box {
          border: 1px solid #333;
          padding: 8px;
          margin-bottom: 10px;
          min-height: 40px;
        }
        .section-title {
          font-size: 9px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #333;
        }
        .input-lines {
          margin-top: 5px;
        }
        .input-line {
          border-bottom: 1px solid #333;
          height: 12px;
          margin-bottom: 5px;
        }
        .terms-section {
          background-color: #000080;
          color: white;
          padding: 5px;
          text-align: center;
          font-weight: bold;
          font-size: 8px;
          margin-bottom: 10px;
        }
        .signature-section {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .signature-box {
          border: 1px solid #333;
          padding: 5px;
          min-height: 30px;
        }
        .signature-area {
          border: 1px solid #333;
          height: 15px;
          margin-top: 3px;
        }
        .codes-section {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .code-row {
          display: flex;
          gap: 5px;
        }
        .code-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .code-input {
          border: 1px solid #333;
          height: 15px;
          padding: 2px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 9px;
        }
        .items-table th,
        .items-table td {
          border: 1px solid #333;
          padding: 6px;
          text-align: left;
        }
        .items-table th {
          background-color: #f5f5f5;
          font-weight: bold;
          text-align: center;
          font-size: 8px;
        }
        .items-table .text-right {
          text-align: right;
        }
        .product-code-col {
          width: 12%;
          text-align: center;
        }
        .qty-col {
          width: 10%;
          text-align: center;
        }
        .packing-col {
          width: 12%;
          text-align: center;
        }
        .description-col {
          width: 40%;
        }
        .price-col {
          width: 13%;
          text-align: right;
        }
        .total-col {
          width: 13%;
          text-align: right;
        }
        .totals {
          width: 100%;
          max-width: 200px;
          margin-left: auto;
          font-size: 10px;
          border: 1px solid #333;
          padding: 8px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
          border-bottom: 1px solid #eee;
        }
        .totals-row.total {
          font-weight: bold;
          font-size: 12px;
          border-top: 1px solid #333;
          border-bottom: 1px solid #333;
          margin-top: 5px;
        }
        .legal-text {
          font-size: 7px;
          text-align: center;
          margin: 20px 0;
          padding: 8px;
          border: 1px solid #ddd;
          line-height: 1.3;
        }
        .footer-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        .footer-signature-box {
          flex: 1;
          border: 1px solid #333;
          padding: 8px;
          margin-right: 5px;
          text-align: center;
          font-size: 8px;
        }
        .footer-signature-box:last-child {
          margin-right: 0;
        }
        .footer-signature-area {
          border: 1px solid #333;
          height: 20px;
          margin-top: 5px;
        }
        .printer-info {
          font-size: 6px;
          margin-top: 15px;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <div class="company-name">${companyInfo.name}</div>
          <div class="company-details">
            TEL: ${companyInfo.tel1}<br>
            TEL: ${companyInfo.tel2}<br>
            FAX: ${companyInfo.fax}<br>
            ${companyInfo.address}<br>
            REG NR ${companyInfo.regNr}
          </div>
        </div>
        <div class="order-info">
          <div class="order-title">BESTELLING / ORDER</div>
          <div class="order-number">No ${order.invoiceNumber}</div>
          <div class="order-date">DATUM / DATE: ${formatDate(order.createdAt)}</div>
        </div>
      </div>

      <div class="main-content">
        <div class="left-column">
          <div class="section-box">
            <span class="section-title">REKENING AAN / ACCOUNT TO:</span>
            <div class="input-lines">
              <div class="input-line"></div>
              <div class="input-line"></div>
              <div class="input-line"></div>
            </div>
          </div>
          
          <div class="terms-section">
            TERME / TERMS (Normaal 30 dae na staat)
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <span class="section-title">HANDTEKENING: KLIËNT / SIGNATURE: CLIENT:</span>
              <div class="signature-area"></div>
            </div>
            <div class="signature-box">
              <span class="section-title">HANDTEKENING: AGENT / SIGNATURE: AGENT:</span>
              <div class="signature-area"></div>
            </div>
          </div>
        </div>
        
        <div class="right-column">
          <div class="section-box">
            <span class="section-title">AFGELEWER AAN / DELIVERED TO:</span>
            <div class="input-lines">
              <div class="input-line"></div>
              <div class="input-line"></div>
              <div class="input-line"></div>
            </div>
          </div>
          
          <div class="section-box">
            <span class="section-title">PLAASNAAM / NAME OF FARM:</span>
            <div class="input-line"></div>
          </div>
          
          <div class="codes-section">
            <div class="code-row">
              <div class="code-field">
                <span class="section-title">VERTEENWOORDIGER NR / REPRESENTATIVE NR:</span>
                <div class="code-input"></div>
              </div>
              <div class="code-field">
                <span class="section-title">KLIËNT KODE / CUSTOMER CODE:</span>
                <div class="code-input"></div>
              </div>
            </div>
            <div class="code-row">
              <div class="code-field">
                <span class="section-title">BTW / VAT:</span>
                <div class="code-input"></div>
              </div>
              <div class="code-field">
                <span class="section-title">AFLEW'NGS DATUM / DELIVERY DATE:</span>
                <div class="code-input"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      <div class="totals">
        <div class="totals-row">
          <span>SUB TOTAAL / SUB TOTAL:</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        <div class="totals-row">
          <span>BTW / VAT (${order.taxRate}%):</span>
          <span>${formatCurrency(order.taxAmount)}</span>
        </div>
        <div class="totals-row total">
          <span>TOTAAL / TOTAL:</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
      </div>

      <div class="legal-text">
        OOSVAAL LANDBOU VERKOOP SY PRODUKTE STRENG ONDERHEWIG AAN DIE BEPALINGS EN VOORWAARDES SOOS VERVAT OP DIE KEERSY VAN HIERDIE DOKUMENT<br>
        THE SALE OF ITS PRODUCT BY OOSVAAL LANDBOU IS IN EVERY INSTANCE SUBJECT TO THE TERMS AND CONDITIONS OF SALE CONTAINED ON THE REVERSE HEREOF
      </div>

      <div class="footer-signatures">
        <div class="footer-signature-box">
          <span class="section-title">HANDTEKENING KOPER / SIGNATURE BUYER:</span>
          <div class="footer-signature-area"></div>
        </div>
        <div class="footer-signature-box">
          <span class="section-title">HANDTEKENING VERTEENWOORDIGER / SIGNATURE REPRESENTATIVE:</span>
          <div class="footer-signature-area"></div>
        </div>
        <div class="footer-signature-box">
          <span class="section-title">DATUM / DATE:</span>
          <div class="footer-signature-area"></div>
        </div>
      </div>
      
      <div class="printer-info">ELPRESS DRUKKERS BK - 17380/2015</div>
    </body>
    </html>
  `;
};

module.exports = { generateHTML };
