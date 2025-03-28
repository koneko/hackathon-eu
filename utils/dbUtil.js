import { sanitize, validate } from "string-sanitizer";
import { v4 as uuidv4 } from "uuid";

import mongoose from "mongoose";
import userSchema from "../models/User.js";
import sessionSchema from "../models/UserSession.js";
import profilSchema from "../models/Profil.js";
import connectionsSchema from "../models/Connections.js";
import partneredSchema from "../models/partnered.js";

const User = mongoose.model("User", userSchema);
const Session = mongoose.model("Session", sessionSchema);
const Profil = mongoose.model("Profil", profilSchema);
const Connection = mongoose.model("Connection", connectionsSchema);
const Partnered = mongoose.model("Partnered", partneredSchema);

function sanitizeHTML(str) {
    return str.replace(/[&<>"']/g, function (match) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[match];
    });
}

function sanitizeList(stringArray) {
	return stringArray.map((str) => sanitizeHTML(str));
}

export async function connect() {
	try {
		return await mongoose.connect(
			"mongodb://127.0.0.1:27017/your_database_name",
			{
				// Replace with your MongoDB connection string
				useNewUrlParser: true,
				useUnifiedTopology: true,
			}
		);
	} catch (error) {
		console.error("Error:", error);
	}
}

export async function createUser(
	ime,
	prezime,
	mail,
	accountType,
	tags = [],
	pfp = null
) {
	if (!validate.isEmail(mail)) {
		return { status: 400, message: "Invalid mail" };
	}

	const newUser = new User({
		ime: sanitize(ime),
		prezime: sanitize(prezime),
		mail: mail,
		tags: JSON.stringify(sanitizeList(tags)),
		accountType: sanitize(accountType),
		pfp: pfp, // uri
	});

	await newUser.save();
}

// export async function createUser(ime, prezime, mail, accountType, tags=[], pfp=null) {

//     if(!sanitize.validateEmail(mail)) { return {"status": 400, "message": "Invalid mail"} }

//     const newUser = new User({
//         ime: sanitize.sanitize(ime),
//         prezime: sanitize.sanitize(prezime),
//         mail: mail,
//         tags: sanitizeList(tags),
//         accountType: sanitize.sanitize(accountType),
//         pfp: pfp // uri
//     });

//     await newUser.save();
// }

// // explorable
// const newProfil = new Profil({
//     title: "example profil",
//     desc: "this is an example profil",
//     profileType: "student",
//     usr_id: newUser
// })
// await newProfil.save();
