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
          padding: 40px;
          color: #333;
          background: #f8f9fa;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .invoice-card {
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          padding: 30px;
          margin-bottom: 30px;
          border: 1px solid #dee2e6;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #dee2e6;
        }
        .invoice-info {
          flex: 1;
        }
        .invoice-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .invoice-value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        .invoice-value.amount {
          font-size: 32px;
          color: #007bff;
        }
        .customer-info {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .customer-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
          margin-bottom: 5px;
        }
        .customer-value {
          font-size: 16px;
          color: #333;
          font-weight: 500;
          margin-bottom: 15px;
        }
        .customer-value:last-child {
          margin-bottom: 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .items-table th,
        .items-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }
        .items-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #333;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        .items-table td {
          color: #333;
        }
        .items-table .text-right {
          text-align: right;
        }
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .totals-table {
          width: 300px;
        }
        .totals-table tr {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }
        .totals-table tr:last-child {
          border-top: 2px solid #dee2e6;
          padding-top: 15px;
          margin-top: 10px;
          font-weight: bold;
          font-size: 18px;
        }
        .totals-table td {
          color: #333;
        }
        @media print {
          body {
            background: #ffffff;
            padding: 0;
          }
          .invoice-card {
            box-shadow: none;
            border: none;
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="invoice-header">
          <div class="invoice-info">
            <div class="invoice-label">Invoice Number</div>
            <div class="invoice-value">${order.invoiceNumber}</div>
          </div>
          <div class="invoice-info">
            <div class="invoice-label">Date</div>
            <div class="invoice-value">${formatDate(order.createdAt)}</div>
          </div>
          <div class="invoice-info" style="text-align: right;">
            <div class="invoice-label">Total</div>
            <div class="invoice-value amount">${formatCurrency(order.total || 0)}</div>
          </div>
        </div>

        <div class="customer-info">
          <div class="customer-label">Bill To</div>
          <div class="customer-value">${order.customerInfo.name || ''}</div>
          ${order.customerInfo.email ? `
            <div class="customer-label">Email</div>
            <div class="customer-value">${order.customerInfo.email}</div>
          ` : ''}
          ${order.customerInfo.phone ? `
            <div class="customer-label">Phone</div>
            <div class="customer-value">${order.customerInfo.phone}</div>
          ` : ''}
          ${addressString ? `
            <div class="customer-label">Address</div>
            <div class="customer-value">${addressString}</div>
          ` : ''}
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total Price</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.name || ''}</td>
                <td>${item.quantity || 0} ${item.unit || ''}</td>
                <td class="text-right">${formatCurrency(item.unitPrice || 0)}</td>
                <td class="text-right">${formatCurrency(item.totalPrice || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-section">
          <table class="totals-table">
            <tbody>
              <tr>
                <td>Subtotal:</td>
                <td>${formatCurrency(order.subtotal || 0)}</td>
              </tr>
              ${order.taxRate > 0 ? `
                <tr>
                  <td>Tax (${order.taxRate}%):</td>
                  <td>${formatCurrency(order.taxAmount || 0)}</td>
                </tr>
              ` : ''}
              <tr>
                <td>Total:</td>
                <td>${formatCurrency(order.total || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateHTML };

