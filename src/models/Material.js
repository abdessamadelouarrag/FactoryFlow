import mongoose from 'mongoose';
import { nonNegativeNumber } from './validators.js';

const materialSchema = new mongoose.Schema({
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
    trim: true,
    maxlength : 3
  },
}, { timestamps: true });

export default mongoose.model('Material', materialSchema);
