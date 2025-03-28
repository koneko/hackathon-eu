import express from "express";
import * as dbUtil from "./utils/dbUtil.js";
import path from "path";

const app = express();
const port = process.env.port || 3000;

async function authenticateToken(req, res, next) {
	let token = req.headers?.authorization;
	if (!token || !(await dbUtil.validateSessionToken(token))) {
		return res.redirect("/account/login");
	}
	next();
}

app.use(express.static("public"));
app.use("/pictures", express.static("pictures"));

app.use(express.json());

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

// {
// 	"name": "Ime",
// 	"lastName": "Prezime",
// 	"mail": "mail",
// 	"accType": "account type/ np student",
// 	"tags": []
// }

app.post("/api/makeSession", async (req, res) => {
	let user_id = req.body.user_id;
	if (!!(await dbUtil.createSession(await dbUtil.findUserById(user_id)))) {
		return res.send(200);
	}
	return res.send(400);
});

app.post("/api/getAcc", async (req, res) => {
	let mail = req.body.mail; // {"mail": "mail@gmail.com"}
	let usr = await dbUtil.findUserByMail(mail);
	if (!!usr) {
		return res.json({ user_id: usr.usr_id });
	}
	return res.send(400);
});

app.post("/api/update/user", authenticateToken, async (req, res) => {
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

app.post("/api/add/connections", authenticateToken, async (req, res) => {
	let sesh_id = req.headers.authorization;
	let updateData = req.body.updateData;

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

app.post("/api/makeAccount", async (req, res) => {
	let name = req.body.name;
	let lastName = req.body.lastName;
	let mail = req.body.mail;
	let accType = req.body.accType;
	let tags = req.body.tags;

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

app.post("/api/verify/mailcode", async (req, res) => {
	let mail_code = req.body.mail.mail_code;
	let user_id = req.body.mail.user_id;

	try {
		if (await dbUtil.validateEmailCode(user_id, mail_code)) {
			let sesh = await dbUtil.getUserSession(user_id);
			return res.json({ authorization: sesh.session_id });
		}
	} catch {
		return res.send(400);
	}
});

app.post("/api/upload/pfp", authenticateToken, async (req, res) => {
	let user_id = await dbUtil.session2userID(req.headers.authorization);
	if (!user_id) {
		return res.send(400);
	}

	// const form = document.getElementById('uploadForm');
	// const messageDiv = document.getElementById('message');
	// const imagePreviewDiv = document.getElementById('imagePreview');
	// const imageInput = document.getElementById('image');

	// imageInput.addEventListener('change', () => {
	//   const file = imageInput.files[0];
	//   if (file) {
	//     const reader = new FileReader();
	//     reader.onload = (e) => {
	//       imagePreviewDiv.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px;">`;
	//     };
	//     reader.readAsDataURL(file);
	//   } else {
	//     imagePreviewDiv.innerHTML = ''; // Clear preview if no file selected
	//   }
	// });

	// form.addEventListener('submit', async (event) => {
	//   event.preventDefault();

	//   const formData = new FormData(form);

	//   try {
	//     const response = await fetch('/upload', { // Ensure your backend endpoint is '/upload'
	//       method: 'POST',
	//       body: formData,
	//     });

	//     if (response.ok) {
	//       messageDiv.textContent = 'Image uploaded successfully!';
	//     } else {
	//       const errorText = await response.text();
	//       messageDiv.textContent = `Upload failed: ${errorText}`;
	//     }
	//   } catch (error) {
	//     console.error('Error uploading image:', error);
	//     messageDiv.textContent = 'An error occurred during upload.';
	//   }
	// });

	let body = "";

	req.on("data", (chunk) => {
		body += chunk;
	});

	req.on("end", () => {
		try {
			const boundary = body.split("\r\n")[0].slice(2);
			const parts = body.split(`--${boundary}`);
			const filePart = parts[1];

			if (!filePart) {
				return res.status(400).send("No file uploaded.");
			}

			const filenameMatch = filePart.match(/filename="(.+?)"/);
			if (!filenameMatch) {
				return res.status(400).send("Invalid file data.");
			}

			const fileDataStart = filePart.indexOf("\r\n\r\n") + 4;
			const fileDataEnd = filePart.lastIndexOf("\r\n");
			const fileData = filePart.slice(fileDataStart, fileDataEnd);

			const filePath = path.join(__dirname, "pictures", user_id + ".png");

			fs.mkdirSync(path.join(__dirname, "pictures"), { recursive: true }); // Ensure directory exists

			fs.writeFile(filePath, Buffer.from(fileData, "binary"), (err) => {
				if (err) {
					console.error(err);
					return res.status(500).send("Error saving file.");
				}
				res.send("File uploaded successfully!");
			});
		} catch (error) {
			console.error(error);
			res.status(500).send("An error occurred during file processing.");
		}
	});
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

app.post("/api/add/profil", authenticateToken, async (req, res) => {
	let sesh_id = req.headers.authorization;
	let updateData = req.body.updateData;

	let user_id = await dbUtil.session2userID(sesh_id);
	if (!user_id) {
		return res.send(400);
	}
	updateData.userid = user_id;

	try {
		let upd = await dbUtil.createProfil(
			updateData.userid,
			updateData.title,
			updateData.desc,
			updateData.profileType,
			updateData.tags
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
	let sesh_id = req.headers.authorization;
	let limit = req.body.limit;

	if(limit > 100) {
		return res.send(400);
	}

	res.json(await dbUtil.getProfils(limit));

	// try {
	// 	let upd = await dbUtil.createProfil(
	// 		updateData.userid,
	// 		updateData.title,
	// 		updateData.desc,
	// 		updateData.profileType,
	// 		updateData.tags
	// 	);
	// 	if (!upd) {
	// 		return res.send(400);
	// 	}
	// 	return res.send(upd);
	// } catch {
	// 	return res.send(400);
	// }
});


//

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
