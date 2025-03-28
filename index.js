import express from "express";
import * as dbUtil from "./utils/dbUtil.js"

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
app.use(express.json());

await dbUtil.connect()

app.get("/", (req, res) => {
	res.send("Hello, World");
});

app.post("/api/verify/session", async (req, res) => {
	let user_id = req.body.user_id;
	let session_id = req.body.session_id;

	if(!await dbUtil.validateSessionToken(session_id))  { return res.send(400); }
	let usr_id = await dbUtil.session2userID(session_id)
	if(usr_id != user_id) { return res.send(400); }

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
	if(!!(await dbUtil.createSession(await dbUtil.findUserById(user_id)))){
		return res.send(200);
	}
	return res.send(400);
});

app.post("/api/getAcc", async (req, res) => {
	let mail = req.body.mail; // {"mail": "mail@gmail.com"}
	let usr = await dbUtil.findUserByMail(mail)
	if(!!usr){
		return res.json({"user_id": usr.usr_id});
	};
	return res.send(400);
});

app.post("/api/update/user", authenticateToken, async (req, res) => {
	let user_id = req.body.user_id;
	let updateData = req.body.updateData;

	try{
		let upd = await dbUtil.updateUser(user_id, updateData);
		if(!upd) { return res.send(400); }
		return res.send(upd.status);
	} catch {
		return res.send(400);
	}
});

app.post("/api/update/connections", authenticateToken, async (req, res) => {
	let sesh_id = req.headers.authorization;
	let updateData = req.body.updateData;

	let user_id = await dbUtil.session2userID(sesh_id);
	if(!user_id) { return res.send(400); };
	updateData.usr_id = user_id;

	try{
		let upd = await dbUtil.updateConnection(updateData);
		if(!upd) { return res.send(400); }
		return res.send(upd.status);
	} catch {
		return res.send(400);
	}
});

app.post("/api/add/connections", authenticateToken, async (req, res) => {
	let sesh_id = req.headers.authorization;
	let updateData = req.body.updateData;

	let user_id = await dbUtil.session2userID(sesh_id);
	if(!user_id) { return res.send(400); };
	updateData.usr_id = user_id;

	try{
		let upd = await dbUtil.updateConnection(updateData);
		if(!upd) { return res.send(400); }
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

	try{
		let usr = await dbUtil.createUser(name, lastName, mail, accType, tags);
		if(!usr) { return res.send(400); }
		let sesh = await dbUtil.createSession(usr);
		if(!sesh) { return res.send(400); }
		return res.json({"user_id": usr.usr_id});
	} catch {
		return res.send(400);
	}
});

app.post("/api/verify/mailcode", async (req, res) => {
	let mail_code = req.body.mail.mail_code;
	let user_id = req.body.mail.user_id;

	try{
		if(await dbUtil.validateEmailCode(user_id, mail_code)){
			let sesh = await dbUtil.getUserSession(user_id);
			return res.json({"authorization": sesh.session_id});
		}
	} catch {
		return res.send(400);
	}
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});