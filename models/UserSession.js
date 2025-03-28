import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';

export const sessionSchema = new mongoose.Schema({
	session_id: { type: String, required: true, unique: true, default: uuidv4 },
	usr_id: { type: String, ref: 'User' }, // Reference to User model
	mail_code: { type: Number },
	created_at: { type: Date, default: Date.now },
});