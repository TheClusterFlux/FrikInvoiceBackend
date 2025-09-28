const mongoose = require('mongoose');

const invoiceCounterSchema = new mongoose.Schema({
  prefix: {
    type: String,
    default: 'INV',
    maxlength: 10
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // For backward compatibility
  },
  counter: {
    type: Number,
    default: 0
  },
  lastGenerated: {
    type: Date,
    default: Date.now
  }
});

// Static method to generate next invoice number
invoiceCounterSchema.statics.generateInvoiceNumber = async function(prefix = 'INV', userId = null) {
  try {
    const query = userId ? { prefix, userId } : { prefix, userId: { $exists: false } };
    
    const counter = await this.findOneAndUpdate(
      query,
      { 
        $inc: { counter: 1 },
        $set: { lastGenerated: new Date() }
      },
      { 
        upsert: true, 
        new: true 
      }
    );
    
    const paddedNumber = counter.counter.toString().padStart(5, '0');
    return `${prefix}-${paddedNumber}`;
  } catch (error) {
    console.error('Failed to generate invoice number:', error);
    throw new Error('Failed to generate invoice number');
  }
};

module.exports = mongoose.model('InvoiceCounter', invoiceCounterSchema);

