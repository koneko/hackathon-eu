import mongoose from "mongoose";
const { Schema } = mongoose;

export const userSchema = new Schema({
	id: String,
	mail: String,
	accountType: String,
	creationDate: Date,
	tags: String,
	associatedUsers: String,
});
