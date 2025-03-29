import express from "express";
import * as dbUtil from "./utils/dbUtil.js";
import path from "path";

const app = express();
const port = process.env.port || 3000;

async function authenticateToken(req, res, next) {
	let token = req.headers?.authorization;
	if (!token || !(await dbUtil.validateSessionToken(token))) {
		return res.sendStatus(403);
	}
	next();
}

app.use(express.static("public"));
app.use("/pictures", express.static("pictures"));

app.use(express.json({ limit: "10mb" }));

await dbUtil.connect();

app.get("/", (req, res) => {
	res.send("Hello, World");
});

app.post("/api/verify/session", async (req, res) => {
	let user_id = req.body.user_id;
	let session_id = req.body.session_id;

	if (!(await dbUtil.validateSessionToken(session_id))) {
		return res.send(400);
	}
	let usr_id = await dbUtil.session2userID(session_id);
	if (usr_id != user_id) {
		return res.send(400);
	}

	return res.send(200);
});

app.post("/api/verify/mailcode", async (req, res) => {
	let mail_code = req.body.mail?.mail_code;
	let user_id = req.body.mail?.user_id;

	if (!mail_code || !user_id) {
		return res.send(400);
	}

	try {
		if (await dbUtil.validateEmailCode(user_id, mail_code)) {
			let sesh = await dbUtil.getUserSession(user_id);
			return res.json({ authorization: sesh.session_id });
		}
	} catch {
		return res.send(400);
	}
});

app.post("/api/makeSession", async (req, res) => {
	let user_id = req.body.user_id;
	if (!!(await dbUtil.createSession(await dbUtil.findUserById(user_id)))) {
		return res.send(200);
	}
	return res.send(400);
});

app.post("/api/makeAccount", async (req, res) => {
	let name = req.body.name;
	let lastName = req.body.lastName;
	let mail = req.body.mail;
	let accType = req.body.accType;
	let tags = req.body.tags;
	console.log("Creating account with the following details:");
	console.log("Name:", name);
	console.log("Last Name:", lastName);
	console.log("Email:", mail);
	console.log("Account Type:", accType);
	console.log("Tags:", tags);

	if (mail.includes("+")) {
		return res.send(400);
	}
	try {
		let usr = await dbUtil.createUser(name, lastName, mail, accType, tags);
		if (!usr) {
			return res.send(400);
		}
		let sesh = await dbUtil.createSession(usr);
		if (!sesh) {
			return res.send(400);
		}
		return res.json({ user_id: usr.usr_id });
	} catch {
		return res.send(400);
	}
});

app.post("/api/getAccount", async (req, res) => {
	let mail = req.body.mail; // {"mail": "mail@gmail.com"}
	let usr = await dbUtil.findUserByMail(mail);
	if (!!usr) {
		return res.json({ user_id: usr.usr_id });
	}
	return res.send(400);
});

app.post("/api/getAccountByID", async (req, res) => {
	let usr_id = req.body.user_id; // {"mail": "mail@gmail.com"}
	let usr = await dbUtil.findUserById(usr_id);
	if (!!usr) {
		return res.json(usr);
	}
	return res.send(400);
});

app.post("/api/updateAccount", authenticateToken, async (req, res) => {
	let user_id = req.body.user_id;
	let updateData = req.body.updateData;

	try {
		let upd = await dbUtil.updateUser(user_id, updateData);
		if (!upd) {
			return res.send(400);
		}
		return res.send(upd.status);
	} catch {
		return res.send(400);
	}
});

app.post("/api/update/connections", authenticateToken, async (req, res) => {
	let sesh_id = req.headers.authorization;
	let updateData = req.body.updateData;

	let user_id = await dbUtil.session2userID(sesh_id);
	if (!user_id) {
		return res.send(400);
	}
	updateData.usr_id = user_id;

	try {
		let upd = await dbUtil.updateConnection(updateData);
		if (!upd) {
			return res.send(400);
		}
		return res.send(upd.status);
	} catch {
		return res.send(400);
	}
});

app.post("/api/make/connections", authenticateToken, async (req, res) => {
	let sesh_id = req.headers.authorization;
	let updateData = req.body.updateData;
	console.log(updateData);

	let user_id = await dbUtil.session2userID(sesh_id);
	if (!user_id) {
		return res.send(400);
	}
	updateData.usr_id = user_id;

	try {
		let upd = await dbUtil.createConnection(updateData);
		if (!upd) {
			return res.send(400);
		}
		return res.send(upd.status);
	} catch {
		return res.send(400);
	}
});

app.post("/api/upload/pfp", authenticateToken, async (req, res) => {
	// async function uploadProfilePicture(file) {
	// 	const reader = new FileReader();
	// 	reader.readAsDataURL(file);
	// 	reader.onload = async () => {
	// 		const base64Image = reader.result;

	// 		try {
	// 			const response = await fetch("/api/upload/pfp", {
	// 				method: "POST",
	// 				headers: {
	// 					"Content-Type": "application/json",
	// 					"Authorization": "Bearer YOUR_TOKEN_HERE"
	// 				},
	// 				body: JSON.stringify({ image: base64Image })
	// 			});

	// 			const result = await response.text();
	// 			if (response.ok) {
	// 				alert("Upload successful!");
	// 			} else {
	// 				alert("Upload failed: " + result);
	// 			}
	// 		} catch (error) {
	// 			console.error("Error uploading file:", error);
	// 			alert("An error occurred while uploading.");
	// 		}
	// 	};
	// }

	// document.getElementById("fileInput").addEventListener("change", function(event) {
	// 	const file = event.target.files[0];
	// 	if (file) {
	// 		uploadProfilePicture(file);
	// 	}
	// });

	try {
		let user_id = await dbUtil.session2userID(req.headers.authorization);
		if (!user_id) {
			return res.status(400).send("Invalid session.");
		}

		const { image } = req.body;
		if (!image) {
			return res.status(400).send("No image data provided.");
		}

		const matches = image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
		if (!matches) {
			return res.status(400).send("Invalid image format.");
		}

		const base64Data = matches[2];
		const filePath = path.join(__dirname, "pictures", `${user_id}.png`);

		fs.mkdirSync(path.dirname(filePath), { recursive: true }); // Ensure directory exists

		fs.writeFile(filePath, Buffer.from(base64Data, "base64"), (err) => {
			if (err) {
				console.error(err);
				return res.status(500).send("Error saving file.");
			}
			res.send("File uploaded successfully!");
		});
	} catch (error) {
		console.error(error);
		res.status(500).send("Server error.");
	}
});

// profil

app.post("/api/get/profil", authenticateToken, async (req, res) => {
	let user_id = req.body.user_id;

	try {
		let upd = await dbUtil.getProfilFromUserID(user_id);
		if (!upd) {
			return res.send(404);
		}
		return res.json(upd); // parse obj later
	} catch {
		return res.send(400);
	}
});

app.post("/api/update/profil", authenticateToken, async (req, res) => {
	let sesh_id = req.headers.authorization;
	let updateData = req.body.updateData;

	let user_id = await dbUtil.session2userID(sesh_id);
	if (!user_id) {
		return res.send(400);
	}
	updateData.userid = user_id;

	try {
		let upd = await dbUtil.updateProfil(updateData);
		if (!upd) {
			return res.send(400);
		}
		return res.send(upd.status);
	} catch {
		return res.send(400);
	}
});

app.post("/api/make/profil", authenticateToken, async (req, res) => {
	let sesh_id = req.headers.authorization;
	let updateData = req.body.updateData;
	console.log("Creating profile with the following details:");
	console.log("Session ID:", sesh_id);
	console.log("Update Data:", updateData);
	let user_id = await dbUtil.session2userID(sesh_id);
	if (!user_id) {
		return res.send(400);
	}

	try {
		let upd = await dbUtil.createProfil(
			user_id,
			updateData.title,
			updateData.desc
		);
		if (!upd) {
			return res.send(400);
		}
		return res.send(upd.status);
	} catch {
		return res.send(400);
	}
});

app.post("/api/get/profils", authenticateToken, async (req, res) => {
	let limit = req.body?.limit;
	let profileType = req.body?.profileType;

	if (!limit || !profileType) {
		return res.send(400);
	}

	if (limit > 100) {
		return res.send(400);
	}

	res.json(await dbUtil.getProfils(profileType, limit));
});

app.post("/api/get/connection", authenticateToken, async (req, res) => {
	let usrid = req.body?.user_id;

	if (!usrid) {
		return res.send(400);
	}

	res.json(await dbUtil.getConnectionFromUserID(usrid));
});

app.post("/api/logout", authenticateToken, async (req, res) => {
	let token = req.headers?.authorization;

	try {
		let upd = await dbUtil.removeSession({ session_id: token });
		if (!upd) {
			return res.send(400);
		}
		return res.send(upd.status);
	} catch {
		return res.send(400);
	}
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
