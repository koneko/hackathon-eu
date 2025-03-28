import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';

export const connectionsSchema = new mongoose.Schema({
    con_id: { type: String, required: true, unique: true, default: uuidv4 },
	  mail: { type: String },
    discord: { type: String },
    phone: { type: String },
    telegram: { type: String },
    linkedin: { type: String },
    wa_bis: { type: String },
    viber: { type: String },
    instagram: { type: String },
    github: { type: String },
    teams: { type: String },
    usr_id: { type: String, ref: 'User' }, // Reference to User model
    created_at: { type: Date, default: Date.now },
  });
