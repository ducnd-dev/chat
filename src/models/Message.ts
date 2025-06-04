import mongoose, { Schema } from 'mongoose';
import { IMessage } from '../types';

const messageSchema = new Schema<IMessage>({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  } as any,
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  } as any,
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text',
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });

messageSchema.pre('save', function (next) {
  if (this.isModified('content') && !this.isNew) {
    (this as any).isEdited = true;
    (this as any).editedAt = new Date();
  }
  next();
});

export default mongoose.model<IMessage>('Message', messageSchema);
