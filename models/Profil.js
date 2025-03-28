import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';

const profilSchema = new mongoose.Schema({
    profil_id: { type: String, required: true, unique: true, default: uuidv4 },
    title: { type: String },
    desc: { type: String },
    profileType: { type: String },
    tags: { type: String },
    created_at: { type: Date, default: Date.now },
    usr_id: { type: String, ref: 'User' }, // Reference to User model
});

export default profilSchema;