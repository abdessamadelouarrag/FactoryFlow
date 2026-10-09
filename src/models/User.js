import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['ADMIN', 'OPERATOR'],
    required: true
  },
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (_document, result) => {
    delete result.passwordHash;
    return result;
  },
});

export default mongoose.model('User', userSchema);
