import { Schema, model } from 'mongoose'

const roomSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    ownerId: { type: String, required: true },
    participants: { type: [String], default: [] },
  },
  { timestamps: true },
)

export const RoomModel = model('Room', roomSchema)
