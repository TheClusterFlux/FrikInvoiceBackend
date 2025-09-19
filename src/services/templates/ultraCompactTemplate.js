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
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 8px;
          line-height: 1.2;
          color: #333;
          background: #fff;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 8mm;
          background: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #000080;
        }
        .company-info {
          flex: 2;
        }
        .company-name {
          font-size: 12px;
          font-weight: bold;
          color: #000080;
          margin-bottom: 1mm;
          text-transform: uppercase;
        }
        .company-details {
          font-size: 7px;
          color: #666;
          line-height: 1.3;
        }
        .order-info {
          flex: 1;
          text-align: right;
          border: 1px solid #000080;
          background-color: #000080;
          color: white;
          padding: 2mm;
        }
        .order-title {
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 1mm;
          text-transform: uppercase;
        }
        .order-number {
          font-size: 9px;
          font-weight: bold;
          color: #FF69B4;
          margin-bottom: 1mm;
        }
        .order-date {
          font-size: 7px;
          color: #fff;
        }
        .main-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4mm;
          margin-bottom: 4mm;
        }
        .section {
          border: 1px solid #000080;
          padding: 2mm;
        }
        .section-title {
          font-size: 8px;
          font-weight: bold;
          color: #333;
          margin-bottom: 1mm;
          text-transform: uppercase;
          border-bottom: 1px solid #000080;
          padding-bottom: 1mm;
        }
        .input-lines {
          margin-top: 1mm;
        }
        .input-line {
          border-bottom: 1px solid #000080;
          height: 3mm;
          margin-bottom: 1mm;
        }
        .terms-section {
          background-color: #000080;
          color: white;
          padding: 1mm;
          text-align: center;
          font-weight: bold;
          font-size: 7px;
          margin-bottom: 1mm;
          border: 1px solid #000080;
        }
        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1mm;
          margin-top: 1mm;
        }
        .signature-box {
          border: 1px solid #000080;
          padding: 1mm;
          text-align: center;
        }
        .signature-area {
          height: 6mm;
          border: 1px solid #000080;
          margin-top: 1mm;
        }
        .codes-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1mm;
          margin-top: 1mm;
        }
        .code-field {
          border: 1px solid #000080;
          padding: 1mm;
        }
        .code-label {
          font-size: 6px;
          color: #666;
          margin-bottom: 1mm;
          text-transform: uppercase;
          font-weight: bold;
        }
        .code-input {
          height: 4mm;
          border: 1px solid #000080;
          padding: 0 1mm;
          font-size: 6px;
          width: 100%;
        }
        .table-container {
          margin: 2mm 0;
          border: 1px solid #000080;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7px;
        }
        .items-table th {
          background: #f5f5f5;
          color: #333;
          padding: 1mm;
          text-align: left;
          font-weight: bold;
          font-size: 6px;
          text-transform: uppercase;
          border: 1px solid #000080;
        }
        .items-table td {
          padding: 1mm;
          border: 1px solid #000080;
          vertical-align: top;
        }
        .items-table tr:nth-child(even) {
          background: #fafafa;
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
        .totals-section {
          border: 1px solid #000080;
          padding: 2mm;
          margin: 2mm 0;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
          font-size: 8px;
        }
        .totals-row.total-row {
          border-top: 1px solid #000080;
          padding-top: 1mm;
          margin-top: 1mm;
          font-weight: bold;
          font-size: 9px;
        }
        .totals-label {
          font-weight: bold;
        }
        .totals-value {
          font-weight: bold;
        }
        .legal-text {
          font-size: 6px;
          color: #666;
          text-align: center;
          margin: 2mm 0;
          padding: 1mm;
          border: 1px solid #000080;
          line-height: 1.3;
        }
        .footer-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1mm;
          margin-top: 2mm;
        }
        .footer-signature-box {
          border: 1px solid #000080;
          padding: 1mm;
          text-align: center;
        }
        .footer-signature-box .field-label {
          font-size: 6px;
          color: #666;
          margin-bottom: 1mm;
          font-weight: bold;
          text-transform: uppercase;
        }
        .footer-signature-area {
          height: 5mm;
          border: 1px solid #000080;
          margin-top: 1mm;
        }
        .printer-info {
          font-size: 5px;
          color: #999;
          text-align: center;
          margin-top: 1mm;
          padding-top: 1mm;
          border-top: 1px solid #000080;
        }
      </style>
    </head>
    <body>
      <div class="container">
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
            <div class="section">
              <div class="section-title">REKENING AAN / ACCOUNT TO:</div>
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
                <div class="section-title">HANDTEKENING: KLIËNT / SIGNATURE: CLIENT:</div>
                <div class="signature-area"></div>
              </div>
              <div class="signature-box">
                <div class="section-title">HANDTEKENING: AGENT / SIGNATURE: AGENT:</div>
                <div class="signature-area"></div>
              </div>
            </div>
          </div>
          
          <div class="right-column">
            <div class="section">
              <div class="section-title">AFGELEWER AAN / DELIVERED TO:</div>
              <div class="input-lines">
                <div class="input-line"></div>
                <div class="input-line"></div>
                <div class="input-line"></div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">PLAASNAAM / NAME OF FARM:</div>
              <div class="input-line"></div>
            </div>
            
            <div class="codes-grid">
              <div class="code-field">
                <div class="code-label">VERTEENWOORDIGER NR / REPRESENTATIVE NR:</div>
                <div class="code-input"></div>
              </div>
              <div class="code-field">
                <div class="code-label">KLIËNT KODE / CUSTOMER CODE:</div>
                <div class="code-input"></div>
              </div>
              <div class="code-field">
                <div class="code-label">BTW / VAT:</div>
                <div class="code-input"></div>
              </div>
              <div class="code-field">
                <div class="code-label">AFLEW'NGS DATUM / DELIVERY DATE:</div>
                <div class="code-input"></div>
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
            <div class="code-label">HANDTEKENING KOPER / SIGNATURE BUYER:</div>
            <div class="footer-signature-area"></div>
          </div>
          <div class="footer-signature-box">
            <div class="code-label">HANDTEKENING VERTEENWOORDIGER / SIGNATURE REPRESENTATIVE:</div>
            <div class="footer-signature-area"></div>
          </div>
          <div class="footer-signature-box">
            <div class="code-label">DATUM / DATE:</div>
            <div class="footer-signature-area"></div>
          </div>
        </div>
        
        <div class="printer-info">ELPRESS DRUKKERS BK - 17380/2015</div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateHTML };
