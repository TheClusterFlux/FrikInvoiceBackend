const puppeteer = require('puppeteer');

// Template registry - easily add new templates here
const TEMPLATES = {
  'professional': require('./templates/professionalTemplate'),
  'compact': require('./templates/compactTemplate'),
  'bilingual': require('./templates/bilingualTemplate'),
  'ultra-compact': require('./templates/ultraCompactTemplate')
};

// Current active template (can be changed via environment variable)
const ACTIVE_TEMPLATE = process.env.PDF_TEMPLATE || 'professional';

const generatePDF = async (order, templateName = null) => {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      protocolTimeout: 120000,
      timeout: 120000
    });
    
    const page = await browser.newPage();
    
    // Set page timeout
    page.setDefaultTimeout(60000);
    
    // Use specified template or fall back to active template
    const template = templateName ? TEMPLATES[templateName] : TEMPLATES[ACTIVE_TEMPLATE];
    
    if (!template) {
      throw new Error(`Template '${templateName || ACTIVE_TEMPLATE}' not found. Available templates: ${Object.keys(TEMPLATES).join(', ')}`);
    }
    
    // Generate HTML content using the selected template
    const htmlContent = template.generateHTML(order);
    
    await page.setContent(htmlContent, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Utility functions for templates
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateShort = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Get available templates
const getAvailableTemplates = () => {
  return Object.keys(TEMPLATES);
};

// Get current active template
const getActiveTemplate = () => {
  return ACTIVE_TEMPLATE;
};

module.exports = { 
  generatePDF, 
  getAvailableTemplates, 
  getActiveTemplate,
  formatCurrency,
  formatDate,
  formatDateShort
};