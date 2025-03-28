import mongoose from "mongoose";
const { Schema } = mongoose;

export const userSessionSchema = new Schema({
	id: String,
	token: String,
	userMailCode: String,
});
