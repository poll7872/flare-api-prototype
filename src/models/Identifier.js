import mongoose from 'mongoose';

const IdentifierSchema = new mongoose.Schema({
  flareId: { type: Number, required: true }, // id
  name: { type: String, required: true },
  type: { type: String, required: true },
  searchTypes: [String],
  risks: [Number],
  data: { type: mongoose.Schema.Types.Mixed },
  dataUpdatedAt: { type: Date },
  isDisabled: { type: Boolean },
  urn: { type: String },
  assetUUID: { type: String },
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'alert_created', 'report_ready'],
    default: 'pending'
  },
  alertId: { type: Number },
  reportId: { type: Number },
});

export const Identifier = mongoose.model('Identifier', IdentifierSchema);
