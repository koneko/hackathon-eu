import { sanitize, validate } from "string-sanitizer";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer"
 
import mongoose from "mongoose";
import userSchema from "../models/User.js";
import sessionSchema from "../models/UserSession.js";
import profilSchema from "../models/Profil.js";
import connectionsSchema from "../models/Connections.js";
import partneredSchema from "../models/partnered.js";

// init
const User = mongoose.model("User", userSchema);
const Session = mongoose.model("Session", sessionSchema);
const Profil = mongoose.model("Profil", profilSchema);
const Connection = mongoose.model("Connection", connectionsSchema);
const Partnered = mongoose.model("Partnered", partneredSchema);

const mygmail = "your_email@gmail.com"
let transporter = nodemailer.createTransport({
    service: 'gmail', // or 'smtp.gmail.com'
    auth: {
        user: mygmail, // Your Gmail address
        pass: 'your_app_password', // Your App Password or OAuth2 token
    },
});

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

async function sendEmail(recipient, subject, mail_code) {
    try {  
      // send mail with defined transport object
      let info = await transporter.sendMail({
        from: mygmail, // sender address
        to: recipient, // list of receivers
        subject: subject, // Subject line
        // text: text, // plain text body
        html: `<b>code: ${mail_code}</b>`, // html body
      });
  
      console.log('Message sent: %s', info.messageId);
      return true; // Indicate success
    } catch (error) {
      console.error('Error sending email:', error);
      return false; // Indicate failure
    }
}

function isDateMoreThan5MinutesOld(date) {
    if (!(date instanceof Date)) {
      throw new Error("Input must be a Date object.");
    }
  
    const now = new Date();
    const diffInMilliseconds = now - date;
    const fiveMinutesInMilliseconds = 24 * 60 * 60 * 1000; // 5 minutes * 60 seconds * 1000 milliseconds
  
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
        let sesh = getUserSession(user.usr_id)
        if(sesh) {
            removeSession(sesh);
        }
    } catch (error){
        console.error("Error validating session code:", error);
        return error
    }

    // if(!sendEmail(mail, "Account Verification", mail_code.toString)){
    //     return null
    // }

    const newSession = new Session({
        usr_id: user.usr_id,
        mail_code: mail_code,
	});

	await newSession.save();

    return newSession
}

export async function validateEmailCode(userID, code) {
    try {
        const foundSession = await Session.findOne({
            mail_code: code,
            usr_id: userID,
        });

        if(!foundSession) {
            return false;
        }

        if(isDateMoreThan5MinutesOld(foundSession.created_at)){
            removeSession(foundSession)
            return false;
        }

        return true;

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

        if(!foundSession) {
            return false;
        }

        if(isDateMoreThan5MinutesOld(foundSession.created_at)){
            removeSession(foundSession)
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
            return { status: 404, message: 'User not found' };
        }

        // Validate and sanitize update data
        if (updateData.ime !== undefined) {
            if (updateData.ime.length === 0 || updateData.ime.length > 16) {
                return { status: 400, message: "Invalid name" };
            }
            user.ime = sanitize(updateData.ime);
        }

        if (updateData.prezime !== undefined) {
            if (updateData.prezime.length === 0 || updateData.prezime.length > 16) {
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
            user.pfp = updateData.pfp;
        }

        await user.save();
        return user;

    } catch (error) {
        console.error('Error updating user:', error);
        return { status: 500, message: 'Internal server error' };
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

    if(ime.length == 0 || ime.length > 16) {
        return { status: 400, message: "Invalid name" };
    }

    if(prezime.length == 0 || ime.length > 16) {
        return { status: 400, message: "Invalid name" };
    }

    if(await findUserByMail(mail)){ return { status: 400, message: "User exists" }; }

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
        const user = await User.findById(userId);
        if (!user) {
            return null; // Or throw an error, depending on your needs.
        }
        return user;
    } catch (error) {
        console.error('Error finding user:', error);
        throw error; // Rethrow the error for the calling function to handle.
    }
}
  
export async function findUserByMail(mail) {
    try {
        const foundUser = await User.findOne({
            mail: mail,
        });

        return foundUser;

    } catch (error) {
        console.error('Error finding user:', error);
        throw error; // Rethrow the error for the calling function to handle.
    }
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
