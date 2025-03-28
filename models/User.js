import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';

const userSchema = new mongoose.Schema({
	usr_id: { type: String, required: true, unique: true, default: uuidv4 },
	ime: { type: String },
	prezime: { type: String },
	mail: { type: String },
	pfp: { type: String },
	accountType: { type: String },
	tags: { type: String },
	created_at: { type: Date, default: Date.now },
});
export default userSchema;