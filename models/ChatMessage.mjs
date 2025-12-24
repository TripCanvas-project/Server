import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  tripId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Number,
    default: Date.now
  }
}, {
  timestamps: true
});

chatMessageSchema.index({ tripId: 1, timestamp: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;

