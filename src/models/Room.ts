import mongoose, { Schema } from 'mongoose';
import { IRoom } from '../types';

const roomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  } as any,
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

roomSchema.index({ name: 1 });
roomSchema.index({ owner: 1 });
roomSchema.index({ members: 1 });
roomSchema.index({ isPrivate: 1 });

roomSchema.pre('save', function (next) {
  if (!(this as any).members.includes((this as any).owner)) {
    (this as any).members.push((this as any).owner);
  }
  next();
});

export default mongoose.model<IRoom>('Room', roomSchema);
