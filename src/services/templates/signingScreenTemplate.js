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
      month: 'long',
      day: 'numeric'
    });
  };

  const companyInfo = {
    name: "OOSVAAL LANDBOU",
    address: "POSBUS/P.O. BOX 505, BETHAL 2310",
    tel1: "017 647 5850/3",
    tel2: "017 647 4197",
    fax: "017 647 6058",
    regNr: "2006/03/0066/23"
  };

  const customerAddress = order.customerInfo.address;
  const addressString = customerAddress 
    ? [
        customerAddress.street,
        customerAddress.city,
        customerAddress.state,
        customerAddress.zipCode,
        customerAddress.country
      ].filter(Boolean).join(', ')
    : '';

  const deliveryAddress = order.deliveryInfo?.address;
  const deliveryAddressString = deliveryAddress
    ? [
        deliveryAddress.street,
        deliveryAddress.city,
        deliveryAddress.state,
        deliveryAddress.zipCode,
        deliveryAddress.country
      ].filter(Boolean).join(', ')
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${order.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 10mm;
          color: #333;
          background: #ffffff;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-size: 10pt;
        }
        .invoice-container {
          background: #ffffff;
          max-width: 100%;
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12mm;
          padding-bottom: 8mm;
          border-bottom: 2px solid #dee2e6;
        }
        .company-section {
          flex: 1;
        }
        .company-name {
          font-size: 16pt;
          font-weight: bold;
          color: #333;
          margin-bottom: 3mm;
          letter-spacing: 0.5px;
        }
        .company-details {
          font-size: 8pt;
          color: #666;
          line-height: 1.6;
        }
        .company-details-line {
          margin-bottom: 1mm;
        }
        .invoice-details-section {
          text-align: right;
          flex: 0 0 70mm;
        }
        .invoice-title {
          font-size: 10pt;
          font-weight: bold;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #dee2e6;
        }
        .invoice-number {
          font-size: 16pt;
          font-weight: bold;
          color: #333;
          margin-bottom: 3mm;
        }
        .invoice-date {
          font-size: 9pt;
          color: #666;
        }
        .info-grid {
          display: flex;
          gap: 8mm;
          margin-bottom: 10mm;
        }
        .info-grid .info-box {
          flex: 1;
        }
        .info-box {
          background: #f8f9fa;
          padding: 6mm;
          border-radius: 4px;
          border: 1px solid #dee2e6;
        }
        .info-box-title {
          font-size: 8pt;
          color: #666;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #dee2e6;
        }
        .info-box-content {
          font-size: 9pt;
          color: #333;
          line-height: 1.6;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4mm;
        }
        .info-box-content.single-column {
          grid-template-columns: 1fr;
        }
        .info-box-line {
          margin-bottom: 2mm;
        }
        .info-box-line:last-child {
          margin-bottom: 0;
        }
        .info-box-label {
          font-size: 7pt;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 1mm;
        }
        .info-box-value {
          font-size: 9pt;
          color: #333;
          font-weight: 500;
        }
        .delivery-box {
          background: #f8f9fa;
          border-left: 3px solid #007bff;
        }
        .items-section {
          margin-bottom: 8mm;
        }
        .section-title {
          font-size: 9pt;
          font-weight: bold;
          color: #666;
          margin-bottom: 3mm;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
          border: 1px solid #dee2e6;
        }
        .items-table th {
          background: #f8f9fa;
          color: #333;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 8pt;
          letter-spacing: 0.3px;
          padding: 4mm 3mm;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
        }
        .items-table th.text-right {
          text-align: right;
        }
        .items-table th.text-center {
          text-align: center;
        }
        .items-table td {
          padding: 3mm;
          font-size: 9pt;
          color: #333;
          border-bottom: 1px solid #f0f0f0;
        }
        .items-table td.text-right {
          text-align: right;
        }
        .items-table td.text-center {
          text-align: center;
        }
        .items-table tbody tr:last-child td {
          border-bottom: none;
        }
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 6mm;
        }
        .totals-box {
          width: 70mm;
          border: 1px solid #dee2e6;
          border-radius: 3px;
          padding: 5mm;
          background: #f8f9fa;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 2mm 0;
          font-size: 9pt;
        }
        .totals-row-label {
          color: #666;
        }
        .totals-row-value {
          color: #333;
          font-weight: 500;
        }
        .totals-row.total {
          border-top: 2px solid #dee2e6;
          margin-top: 2mm;
          padding-top: 3mm;
          font-weight: bold;
          font-size: 11pt;
        }
        .totals-row.total .totals-row-label {
          color: #333;
        }
        .totals-row.total .totals-row-value {
          color: #333;
        }
        .notes-section {
          margin-top: 8mm;
          padding: 5mm;
          background: #fff9e6;
          border-left: 3px solid #ffc107;
          border-radius: 3px;
        }
        .notes-label {
          font-size: 8pt;
          color: #666;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 2mm;
        }
        .notes-content {
          font-size: 9pt;
          color: #333;
          line-height: 1.5;
        }
        @media print {
          body {
            background: #ffffff;
            padding: 10mm;
          }
          .invoice-container {
            box-shadow: none;
          }
        }
        @page {
          size: A4;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header: Company and Invoice Details -->
        <div class="header-section">
          <div class="company-section">
            <div class="company-name">${companyInfo.name}</div>
            <div class="company-details">
              <div class="company-details-line">TEL: ${companyInfo.tel1} | TEL: ${companyInfo.tel2}</div>
              <div class="company-details-line">FAX: ${companyInfo.fax}</div>
              <div class="company-details-line">${companyInfo.address}</div>
              <div class="company-details-line">REG NR: ${companyInfo.regNr}</div>
            </div>
          </div>
          <div class="invoice-details-section">
            <div class="invoice-title">Invoice</div>
            <div class="invoice-number">${order.invoiceNumber}</div>
            <div class="invoice-date">${formatDate(order.createdAt)}</div>
          </div>
        </div>

        <!-- Customer and Delivery Information -->
        <div class="info-grid">
          <div class="info-box">
            <div class="info-box-title">Bill To</div>
            <div class="info-box-content">
              <div>
                <div class="info-box-line">
                  <div class="info-box-value">${order.customerInfo.name || ''}</div>
                </div>
                ${addressString ? `
                  <div class="info-box-line">
                    <div class="info-box-value">${addressString}</div>
                  </div>
                ` : ''}
                ${order.signedAt ? `
                  <div class="info-box-line">
                    <div class="info-box-label">Signed By</div>
                    <div class="info-box-value">${order.signedBy || 'N/A'}</div>
                  </div>
                  <div class="info-box-line">
                    <div class="info-box-label">Signed Time</div>
                    <div class="info-box-value">${formatDate(order.signedAt)} ${new Date(order.signedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ` : ''}
              </div>
              <div>
                ${order.customerInfo.phone ? `
                  <div class="info-box-line">
                    <div class="info-box-label">Phone</div>
                    <div class="info-box-value">${order.customerInfo.phone}</div>
                  </div>
                ` : ''}
                ${order.customerInfo.email ? `
                  <div class="info-box-line">
                    <div class="info-box-label">Email</div>
                    <div class="info-box-value">${order.customerInfo.email}</div>
                  </div>
                ` : ''}
                <div class="info-box-line">
                  <div class="info-box-label">VAT Number</div>
                  <div class="info-box-value">${order.customerInfo.taxNumber || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          ${deliveryAddressString && deliveryAddressString !== addressString ? `
            <div class="info-box delivery-box">
              <div class="info-box-title">Delivery Address</div>
              <div class="info-box-content single-column">
                <div class="info-box-line">
                  <div class="info-box-value">${deliveryAddressString}</div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Items Table -->
        <div class="items-section">
          <div class="section-title">Items</div>
          <table class="items-table">
            <thead>
              <tr>
                <th class="text-center" style="width: 12%;">Code</th>
                <th style="width: 40%;">Description</th>
                <th class="text-center" style="width: 15%;">Quantity</th>
                <th class="text-right" style="width: 15%;">Unit Price</th>
                <th class="text-right" style="width: 18%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td class="text-center">${item.code || 'N/A'}</td>
                  <td>${item.name || ''}</td>
                  <td class="text-center">${item.quantity || 0} ${item.unit || ''}</td>
                  <td class="text-right">${formatCurrency(item.unitPrice || 0)}</td>
                  <td class="text-right">${formatCurrency(item.totalPrice || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="totals-section">
          <div class="totals-box">
            <div class="totals-row">
              <span class="totals-row-label">Subtotal:</span>
              <span class="totals-row-value">${formatCurrency(order.subtotal || 0)}</span>
            </div>
            ${order.taxRate > 0 ? `
              <div class="totals-row">
                <span class="totals-row-label">VAT (${order.taxRate}%):</span>
                <span class="totals-row-value">${formatCurrency(order.taxAmount || 0)}</span>
              </div>
            ` : ''}
            <div class="totals-row total">
              <span class="totals-row-label">Total:</span>
              <span class="totals-row-value">${formatCurrency(order.total || 0)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${order.notes ? `
          <div class="notes-section">
            <div class="notes-label">Notes</div>
            <div class="notes-content">${order.notes}</div>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateHTML };
