import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';

const partneredSchema = new mongoose.Schema({
    p_id: { type: String, required: true, unique: true, default: uuidv4 },
    type: { type: String }, // mentor - student / instructor - student
    user1: { type: String, ref: 'User' }, // Reference to User model
    user2: { type: String, ref: 'User' }, // Reference to User model
    created_at: { type: Date, default: Date.now },
});

export default partneredSchema;