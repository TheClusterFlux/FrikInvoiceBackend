/**
 * Tax calculation utilities
 * Supports both tax-added (traditional) and tax-inclusive (reverse) calculations
 */

/**
 * Calculate tax amounts based on the configured method
 * @param {number} unitPrice - The unit price
 * @param {number} quantity - The quantity
 * @param {number} taxRate - The tax rate as a percentage (e.g., 15 for 15%)
 * @param {string} method - 'add' for tax added to price, 'reverse' for tax included in price
 * @returns {Object} - { subtotal, taxAmount, total }
 */
function calculateTax(unitPrice, quantity, taxRate, method = 'reverse') {
  const subtotal = unitPrice * quantity;
  
  if (method === 'add') {
    // Traditional method: tax is added to the price
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  } else {
    // Reverse method: tax is included in the price
    // Formula: taxAmount = total - (total / (1 + taxRate/100))
    const total = subtotal; // The price already includes tax
    const taxAmount = total - (total / (1 + taxRate / 100));
    const calculatedSubtotal = total - taxAmount;
    
    return {
      subtotal: Math.round(calculatedSubtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }
}

/**
 * Calculate tax for multiple items
 * @param {Array} items - Array of items with { unitPrice, quantity, taxRate }
 * @param {string} method - 'add' for tax added to price, 'reverse' for tax included in price
 * @returns {Object} - { subtotal, taxAmount, total, itemBreakdown }
 */
function calculateTaxForItems(items, method = 'reverse') {
  let totalSubtotal = 0;
  let totalTaxAmount = 0;
  let totalAmount = 0;
  const itemBreakdown = [];
  
  items.forEach((item, index) => {
    const calculation = calculateTax(item.unitPrice, item.quantity, item.taxRate, method);
    
    totalSubtotal += calculation.subtotal;
    totalTaxAmount += calculation.taxAmount;
    totalAmount += calculation.total;
    
    itemBreakdown.push({
      index: index + 1,
      ...item,
      ...calculation
    });
  });
  
  return {
    subtotal: Math.round(totalSubtotal * 100) / 100,
    taxAmount: Math.round(totalTaxAmount * 100) / 100,
    total: Math.round(totalAmount * 100) / 100,
    itemBreakdown
  };
}

/**
 * Get the tax calculation method from environment
 * @returns {string} - 'add' or 'reverse'
 */
function getTaxCalculationMethod() {
  return process.env.TAX_CALCULATION_METHOD || 'reverse';
}

module.exports = {
  calculateTax,
  calculateTaxForItems,
  getTaxCalculationMethod
};

