import mongoose from 'mongoose';

const installationSchema = new mongoose.Schema({
  _id:{ 
    type: String,
    enum: ['factoryflow'], 
    default: 'factoryflow' 
  },
  firstAdmin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    immutable: true 
  },
  installedAt: { 
    type: Date, 
    required: true, 
    default: Date.now, 
    immutable: true 
  },
}, { versionKey: false });

export default mongoose.model('Installation', installationSchema);
