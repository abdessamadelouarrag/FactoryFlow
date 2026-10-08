import mongoose from 'mongoose';
import { nonNegativeNumber } from './validators.js';

const rawMaterialSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  availableQuantity: {
    type: Number,
    required: true,
    default: 0,
    validate: nonNegativeNumber
  },
  alertThreshold: {
    type: Number,
    required: true,
    default: 0,
    validate: nonNegativeNumber
  },
}, { timestamps: true });

export default mongoose.model('RawMaterial', rawMaterialSchema);
