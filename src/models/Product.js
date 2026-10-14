import mongoose from 'mongoose';
import { positiveNumber, uniqueMaterials } from './validators.js';

const compositionLineSchema = new mongoose.Schema({
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  },
  quantityPerUnit: {
    type: Number,
    required: true,
    validate: positiveNumber
  },
}, { _id: false });

const productSchema = new mongoose.Schema({
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
  composition: {
    type: [compositionLineSchema],
    required: true,
    validate: uniqueMaterials
  },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
