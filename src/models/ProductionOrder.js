import mongoose from 'mongoose';
import { positiveNumber, uniqueMaterials } from './validators.js';

const snapshotLineSchema = new mongoose.Schema({
  rawMaterial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  },
  reference: {
    type: String,
    required: true,
    trim: true
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
  quantityPerUnit: {
    type: Number,
    required: true,
    validate: positiveNumber
  },
}, { _id: false });

const productionOrderSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productReference: {
    type: String,
    required: true,
    immutable: true
  },
  productName: {
    type: String,
    required: true,
    immutable: true
  },
  quantity: {
    type: Number,
    required: true,
    validate: positiveNumber
  },
  compositionSnapshot: {
    type: [snapshotLineSchema],
    required: true,
    immutable: true,
    validate: uniqueMaterials
  },
  status: {
    type: String,
    enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    required: true,
    default: 'PLANNED'
  },
  assignedOperator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true
  },
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
}, { timestamps: true });

productionOrderSchema.index({ assignedOperator: 1, status: 1, createdAt: -1 });
productionOrderSchema.index({ status: 1, createdAt: -1 });
productionOrderSchema.index({ product: 1, createdAt: -1 });

export default mongoose.model('ProductionOrder', productionOrderSchema);
