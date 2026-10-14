import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: [true, 'La matière première est obligatoire'],
    unique: true, // Document unique par matière première
    immutable: true
  },
  quantityInitial: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
    immutable: true
  },
  quantityCurrent: {
    type: Number,
    required: true,
    min: 0,
    default: function () {
      return this.quantityInitial; 
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true
  }
}, { timestamps: true });

export default mongoose.model('Stock', stockSchema);