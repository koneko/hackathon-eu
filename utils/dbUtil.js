import { sanitize, validate } from "string-sanitizer";
import nodemailer from "nodemailer";
import fs from "fs";

import mongoose from "mongoose";
import userSchema from "../models/User.js";
import sessionSchema from "../models/UserSession.js";
import profilSchema from "../models/Profil.js";
import connectionsSchema from "../models/Connections.js";

// init
const User = mongoose.model("User", userSchema);
const Session = mongoose.model("Session", sessionSchema);
const Profil = mongoose.model("Profil", profilSchema);
const Connection = mongoose.model("Connection", connectionsSchema);

const mailConfig = JSON.parse(fs.readFileSync("./mail.json", "utf8"));

const mygmail = mailConfig.username;
let transporter = nodemailer.createTransport({
	service: "gmail", // or 'smtp.gmail.com'
	auth: {
		user: mygmail, // Your Gmail address
		pass: mailConfig.password, // Your App Password or OAuth2 token
	},
});

function sanitizeHTML(str) {
	return str.replace(/[&<>"']/g, function (match) {
		return {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		}[match];
	});
}

function sanitizeList(stringArray) {
	return stringArray.map((str) => sanitizeHTML(str));
}

export async function connect() {
	try {
		return await mongoose.connect("mongodb://127.0.0.1:27017/stardb", {
			// Replace with your MongoDB connection string
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
	} catch (error) {
		console.error("Error:", error);
	}
}

async function sendEmail(recipient, subject, mail_code) {
	try {
		let data = fs.readFileSync("./public/mailCode.html", "utf8");
		mail_code = mail_code + "";
		data = data.replace("mail_code", mail_code);
		// send mail with defined transport object
		let info = await transporter.sendMail({
			from: mygmail, // sender address
			to: [recipient], // list of receivers
			subject: subject, // Subject line
			// text: text, // plain text body
			html: data,
		});

		console.log("Message sent: %s", info.messageId);
		return true; // Indicate success
	} catch (error) {
		console.error("Error sending email:", error);
		return false; // Indicate failure
	}
}

function isDateMoreThan1DayOld(date) {
	if (!(date instanceof Date)) {
		throw new Error("Input must be a Date object.");
	}

	const now = new Date();
	const diffInMilliseconds = now - date;
	const fiveMinutesInMilliseconds = 24 * 60 * 60 * 1000; // 5 minutes * 60 seconds * 1000 milliseconds

	return diffInMilliseconds > fiveMinutesInMilliseconds;
}

function isDateMoreThan5MinutesOldFrthisTime(date) {
	if (!(date instanceof Date)) {
		throw new Error("Input must be a Date object.");
	}

	const now = new Date();
	const diffInMilliseconds = now - date;
	const fiveMinutesInMilliseconds = 5 * 60 * 1000; // 5 minutes * 60 seconds * 1000 milliseconds

	return diffInMilliseconds > fiveMinutesInMilliseconds;
}

export async function getUserSession(userID) {
	try {
		const foundSession = await Session.findOne({
			usr_id: userID,
		});

		return foundSession;
	} catch (error) {
		console.error("Error validating session code:", error);
		return false;
	}
}

export async function removeSession(sesh) {
	return await Session.deleteOne({ session_id: sesh.session_id });
}

export async function createSession(user) {
	const mail_code = Math.floor(100000 + Math.random() * 900000);
	const mail = user.mail;

	try {
		let sesh = await getUserSession(user.usr_id);
		if (sesh) {
			await removeSession(sesh);
		}
	} catch (error) {
		console.error("Error validating session code:", error);
		return error;
	}

	if (!sendEmail(mail, "STAR Account Verification", mail_code.toString())) {
		return null;
	}

	const newSession = new Session({
		usr_id: user.usr_id,
		mail_code: mail_code,
	});

	await newSession.save();

	return newSession;
}

export async function validateEmailCode(userID, code) {
	try {
		const foundSession = await Session.findOne({
			mail_code: code,
			usr_id: userID,
		});

		if (!foundSession) {
			return false;
		}

		if (isDateMoreThan5MinutesOldFrthisTime(foundSession.created_at)) {
			await removeSession(foundSession);
			return false;
		}

		return true;
	} catch (error) {
		console.error("Error validating session code:", error);
		return false;
	}
}

export async function session2userID(token) {
	try {
		const foundSession = await Session.findOne({
			session_id: token,
		});

		if (!foundSession) {
			return false;
		}

		if (isDateMoreThan1DayOld(foundSession.created_at)) {
			await removeSession(foundSession);
			return false;
		}

		return foundSession.usr_id;
	} catch (error) {
		console.error("Error validating session code:", error);
		return false;
	}
}

export async function validateSessionToken(token) {
	try {
		const foundSession = await Session.findOne({
			session_id: token,
		});

		if (!foundSession) {
			return false;
		}

		if (isDateMoreThan1DayOld(foundSession.created_at)) {
			await removeSession(foundSession);
			return false;
		}

		return true;
	} catch (error) {
		console.error("Error validating session code:", error);
		return false;
	}
}

export async function updateUser(userId, updateData) {
	try {
		const user = await User.findById(userId);

		if (!user) {
			return { status: 404, message: "User not found" };
		}

		// Validate and sanitize update data
		if (updateData.ime !== undefined) {
			if (updateData.ime.length === 0 || updateData.ime.length > 16) {
				return { status: 400, message: "Invalid name" };
			}
			user.ime = sanitize(updateData.ime);
		}

		if (updateData.prezime !== undefined) {
			if (
				updateData.prezime.length === 0 ||
				updateData.prezime.length > 16
			) {
				return { status: 400, message: "Invalid last name" };
			}
			user.prezime = sanitize(updateData.prezime);
		}

		if (updateData.mail !== undefined) {
			if (!validate.isEmail(updateData.mail)) {
				return { status: 400, message: "Invalid mail" };
			}
			user.mail = updateData.mail;
		}

		if (updateData.accountType !== undefined) {
			user.accountType = sanitize(updateData.accountType);
		}

		if (updateData.tags !== undefined) {
			user.tags = JSON.stringify(sanitizeList(updateData.tags));
		}

		if (updateData.pfp !== undefined) {
			if (
				new TextEncoder().encode(updateData.pfp).length >
				15 * 1024 * 1024
			) {
				return { status: 400, message: "Invalid pfp size" };
			}
			user.pfp = updateData.pfp;
		}

		await user.save();
		return { status: 200, message: "User Updated" };
	} catch (error) {
		console.error("Error updating user:", error);
		return { status: 500, message: "Internal server error" };
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

	if (ime.length == 0 || ime.length > 16) {
		return { status: 400, message: "Invalid name" };
	}

	if (prezime.length == 0 || ime.length > 16) {
		return { status: 400, message: "Invalid name" };
	}

	if (await findUserByMail(mail)) {
		return { status: 400, message: "User exists" };
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
	return newUser;
	// const session = await createSession(newUser);
	// return [newUser, session]
}

export async function findUserById(userId) {
	try {
		return await User.findOne({
			usr_id: userId,
		});
	} catch (error) {
		console.error("Error finding user:", error);
		throw error; // Rethrow the error for the calling function to handle.
	}
}

export async function findUserByMail(mail) {
	try {
		return await User.findOne({
			mail: mail,
		});
	} catch (error) {
		console.error("Error finding user:", error);
		throw error; // Rethrow the error for the calling function to handle.
	}
}

export async function getConnectionFromUserID(userID) {
	try {
		const connection = await Connection.findOne({ usr_id: userID });
		console.log(connection);
		if (!connection) {
			return { status: 404 };
		}
		return connection;
	} catch (error) {
		console.error("Error finding user:", error);
		return false;
		// throw error; // Rethrow the error for the calling function to handle.
	}
}

export async function createConnection(connectionData) {
	try {
		const connection = await Connection.findOne({
			usr_id: connectionData.usr_id,
		});

		if (connection) {
			return { status: 400, message: "Connection exists" };
		}

		if (connectionData.mail && !validate.isEmail(connectionData.mail)) {
			return { status: 400, message: "Invalid mail" };
		}

		const newConnection = new Connection({
			mail: connectionData.mail,
			discord: connectionData.discord,
			phone: connectionData.phone,
			telegram: connectionData.telegram,
			linkedin: connectionData.linkedin,
			wa_bis: connectionData.wa_bis,
			viber: connectionData.viber,
			instagram: connectionData.instagram,
			github: connectionData.github,
			teams: connectionData.teams,
			usr_id: connectionData.usr_id,
		});

		await newConnection.save();
		return newConnection;
	} catch (error) {
		console.error("Error creating connection:", error);
		return { status: 500, message: "Internal server error" };
	}
}

export async function updateConnection(updateData) {
	try {
		const connection = await Connection.findOne({
			usr_id: updateData.usr_id,
		});

		if (!connection) {
			return { status: 404, message: "Connection not found" };
		}

		if (updateData.mail !== undefined) {
			if (updateData.mail && !validate.isEmail(updateData.mail)) {
				return { status: 400, message: "Invalid mail" };
			}
			connection.mail = updateData.mail;
		}

		if (updateData.discord !== undefined) {
			connection.discord = updateData.discord;
		}

		if (updateData.phone !== undefined) {
			connection.phone = updateData.phone;
		}

		if (updateData.telegram !== undefined) {
			connection.telegram = updateData.telegram;
		}

		if (updateData.linkedin !== undefined) {
			connection.linkedin = updateData.linkedin;
		}

		if (updateData.wa_bis !== undefined) {
			connection.wa_bis = updateData.wa_bis;
		}

		if (updateData.viber !== undefined) {
			connection.viber = updateData.viber;
		}

		if (updateData.instagram !== undefined) {
			connection.instagram = updateData.instagram;
		}

		if (updateData.github !== undefined) {
			connection.github = updateData.github;
		}

		if (updateData.teams !== undefined) {
			connection.teams = updateData.teams;
		}

		if (updateData.usr_id !== undefined) {
			connection.usr_id = updateData.usr_id;
		}

		await connection.save();
		return connection;
	} catch (error) {
		console.error("Error updating connection:", error);
		return { status: 500, message: "Internal server error" };
	}
}

export async function getProfilFromUserID(userID) {
	try {
		return await Profil.findOne({ usr_id: userID });
	} catch (error) {
		console.error("Error finding user:", error);
		return false;
		// throw error; // Rethrow the error for the calling function to handle.
	}
}

export async function createProfil(userid, title, desc) {
	try {
		const profil = await Profil.findOne({ usr_id: userid });

		if (profil) {
			return { status: 400, message: "Profil exists" };
		}

		const newProfil = new Profil({
			title: sanitizeHTML(title),
			desc: sanitizeHTML(desc),
			usr_id: userid,
		});

		await newProfil.save();
		return { status: 200, message: "Profil created" };
	} catch (error) {
		console.error("Error creating newProfil:", error);
		return { status: 500, message: "Internal server error" };
	}
}

export async function updateProfil(updateData) {
	try {
		const profil = await Profil.findOne({ usr_id: updateData.userid });

		if (!profil) {
			return { status: 404, message: "profil not found" };
		}

		if (updateData.title !== undefined) {
			profil.title = sanitizeHTML(updateData.title);
		}

		if (updateData.desc !== undefined) {
			profil.desc = sanitizeHTML(updateData.desc);
		}

		await profil.save();
		return { status: 200, message: "Profil created" };
	} catch (error) {
		console.error("Error updating profil:", error);
		return { status: 500, message: "Internal server error" };
	}
}

export async function getProfils(profileType, n) {
	try {
		const profils = await Profil.aggregate([
			{
				$lookup: {
					from: "users", // MongoDB automatically converts model names to lowercase + plural
					localField: "usr_id",
					foreignField: "usr_id",
					as: "user_data",
				},
			},
			{
				$match: {
					"user_data.accountType": profileType, // Ensure only documents with the specific flag are retrieved
				},
			},
			{ $limit: n }, // Limit the results to 50
		]);

		if (!profils) {
			return { status: 404, message: "profil not found" };
		}

		return profils;
	} catch (error) {
		console.error("Error getting profils:", error);
		return { status: 500, message: "Internal server error" };
	}
}
