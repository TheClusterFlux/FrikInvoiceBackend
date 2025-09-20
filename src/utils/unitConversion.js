// Unit conversion utility
// This handles common unit conversions for inventory items

const UNIT_CONVERSIONS = {
  // Volume conversions (all to liters)
  volume: {
    'ml': 0.001,
    'milliliter': 0.001,
    'millilitre': 0.001,
    'l': 1,
    'liter': 1,
    'litre': 1,
    'dl': 0.1,
    'deciliter': 0.1,
    'decilitre': 0.1,
    'cl': 0.01,
    'centiliter': 0.01,
    'centilitre': 0.01,
    'gal': 3.78541,
    'gallon': 3.78541,
    'qt': 0.946353,
    'quart': 0.946353,
    'pt': 0.473176,
    'pint': 0.473176,
    'fl oz': 0.0295735,
    'fluid ounce': 0.0295735,
    'cup': 0.236588,
    'tbsp': 0.0147868,
    'tablespoon': 0.0147868,
    'tsp': 0.00492892,
    'teaspoon': 0.00492892,
  },
  
  // Weight conversions (all to kilograms)
  weight: {
    'mg': 0.000001,
    'milligram': 0.000001,
    'g': 0.001,
    'gram': 0.001,
    'kg': 1,
    'kilogram': 1,
    'lb': 0.453592,
    'pound': 0.453592,
    'lbs': 0.453592,
    'oz': 0.0283495,
    'ounce': 0.0283495,
    'ton': 1000,
    'tonne': 1000,
    'metric ton': 1000,
  },
  
  // Length conversions (all to meters)
  length: {
    'mm': 0.001,
    'millimeter': 0.001,
    'millimetre': 0.001,
    'cm': 0.01,
    'centimeter': 0.01,
    'centimetre': 0.01,
    'm': 1,
    'meter': 1,
    'metre': 1,
    'km': 1000,
    'kilometer': 1000,
    'kilometre': 1000,
    'in': 0.0254,
    'inch': 0.0254,
    'ft': 0.3048,
    'foot': 0.3048,
    'feet': 0.3048,
    'yd': 0.9144,
    'yard': 0.9144,
    'mi': 1609.34,
    'mile': 1609.34,
  },
  
  // Area conversions (all to square meters)
  area: {
    'mm²': 0.000001,
    'cm²': 0.0001,
    'm²': 1,
    'km²': 1000000,
    'in²': 0.00064516,
    'ft²': 0.092903,
    'yd²': 0.836127,
    'acre': 4046.86,
    'hectare': 10000,
  },
  
  // Count/quantity (no conversion needed)
  count: {
    'each': 1,
    'piece': 1,
    'item': 1,
    'unit': 1,
    'pcs': 1,
    'pieces': 1,
    'items': 1,
    'units': 1,
    'dozen': 12,
    'doz': 12,
    'gross': 144,
    'box': 1,
    'case': 1,
    'pack': 1,
    'package': 1,
    'bag': 1,
    'bottle': 1,
    'can': 1,
    'jar': 1,
    'tube': 1,
    'roll': 1,
    'sheet': 1,
    'page': 1,
  }
};

// Detect unit category based on unit string
function detectUnitCategory(unit) {
  const unitLower = unit.toLowerCase().trim();
  
  // Check each category
  for (const [category, units] of Object.entries(UNIT_CONVERSIONS)) {
    if (units[unitLower]) {
      return category;
    }
  }
  
  // Default to count if no match found
  return 'count';
}

// Convert quantity to base unit
function convertToBaseUnit(quantity, unit) {
  const category = detectUnitCategory(unit);
  const unitLower = unit.toLowerCase().trim();
  const conversionFactor = UNIT_CONVERSIONS[category][unitLower] || 1;
  
  return quantity * conversionFactor;
}

// Format quantity with appropriate unit
function formatQuantity(quantity, category, precision = 2) {
  if (category === 'count') {
    return Math.round(quantity).toString();
  }
  
  // For other categories, format with appropriate precision
  if (quantity >= 1000) {
    return quantity.toFixed(0);
  } else if (quantity >= 100) {
    return quantity.toFixed(1);
  } else if (quantity >= 10) {
    return quantity.toFixed(2);
  } else {
    return quantity.toFixed(3);
  }
}

// Get display unit for category
function getDisplayUnit(category) {
  const displayUnits = {
    volume: 'L',
    weight: 'kg',
    length: 'm',
    area: 'm²',
    count: 'units'
  };
  
  return displayUnits[category] || 'units';
}

// Calculate total quantity for items with same unit category
function calculateTotalQuantity(items) {
  const totals = {};
  
  items.forEach(item => {
    if (!item.inventoryId || !item.quantity || !item.unit) return;
    
    const category = detectUnitCategory(item.unit);
    const baseQuantity = convertToBaseUnit(item.quantity, item.unit);
    
    if (!totals[category]) {
      totals[category] = {
        total: 0,
        unit: getDisplayUnit(category),
        items: []
      };
    }
    
    totals[category].total += baseQuantity;
    totals[category].items.push({
      description: item.description || 'Unknown Item',
      quantity: item.quantity,
      unit: item.unit,
      baseQuantity: baseQuantity
    });
  });
  
  // Format totals
  Object.keys(totals).forEach(category => {
    totals[category].formattedTotal = formatQuantity(totals[category].total, category);
  });
  
  return totals;
}

module.exports = {
  detectUnitCategory,
  convertToBaseUnit,
  formatQuantity,
  getDisplayUnit,
  calculateTotalQuantity,
  UNIT_CONVERSIONS
};

