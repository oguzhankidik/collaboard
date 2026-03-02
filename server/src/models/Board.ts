import { Schema, model } from 'mongoose'

const pointSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false },
)

const drawElementSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['pen', 'rect', 'circle', 'arrow', 'text', 'select'],
      required: true,
    },
    points: { type: [pointSchema], required: true },
    color: { type: String, required: true },
    strokeWidth: { type: Number, required: true },
    text: { type: String },
    userId: { type: String, required: true },
    createdAt: { type: Number, required: true },
  },
  { _id: false },
)

const boardSchema = new Schema(
  {
    roomId: { type: String, required: true, unique: true },
    elements: { type: [drawElementSchema], default: [] },
  },
  { timestamps: true },
)

export const BoardModel = model('Board', boardSchema)
