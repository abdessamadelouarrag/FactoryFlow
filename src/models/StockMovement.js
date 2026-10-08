import mongoose from 'mongoose';
import { positiveNumber } from './validators.js';

const stockMovementSchema = new mongoose.Schema({
  rawMaterial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterial',
    required: true,
    immutable: true
  },
  type: {
    type: String,
    enum: ['IN', 'OUT'],
    required: true,
    immutable: true
  },
  quantity: {
    type: Number,
    required: true,
    validate: positiveNumber,
    immutable: true
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    immutable: true
  },
  productionOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionOrder',
    default: null,
    immutable: true,
    required: function () { return this.type === 'OUT'; }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true
  },
  note: {
    type: String,
    trim: true,
    default: '',
    immutable: true
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

stockMovementSchema.index({ rawMaterial: 1, createdAt: -1 });
// Une seule consommation par matière pour un ordre donné.
stockMovementSchema.index({ productionOrder: 1, rawMaterial: 1 }, {
  unique: true, partialFilterExpression: { type: 'OUT' },
});

export default mongoose.model('StockMovement', stockMovementSchema);
