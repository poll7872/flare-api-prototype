import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  flareId: {
    type: Number,
    required: true,
    unique: true,
  },
  assetId: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'email',
  },
  searchTypes: {
    type: [String],
    default: [],
  },
  risks: {
    type: [Number],
    default: [],
  },
  frequency: {
    type: Number,
    required: true,
  },
  tenantId: {
    type: Number,
    required: true,
  },
  organizationId: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  startAt: {
    type: Date,
    required: true,
  }
}, {
  timestamps: true,
});

export const Alert = mongoose.model('Alert', alertSchema);
