import express from "express";
import * as dbUtil from "./utils/dbUtil.js"

const app = express();
const port = process.env.port || 3000;

app.use(express.static("public"));
app.use(express.json());

await dbUtil.connect()

app.get("/", (req, res) => {
	res.send("Hello, World");
});

app.get("/testing", async (req, res) => {
	// let usr = await dbUtil.createUser("Marko", "Markic", "marko@mail.com", "Student", ["c#", "C++"]);
	// let kita2 = await dbUtil.createSession(usr);
	// let kita = (await dbUtil.validateEmailCode(usr.usr_id, kita2.mail_code)).toString()
	let token = req.headers?.authorization;
	if(!token) { return res.send(403); }
	if(!await dbUtil.validateSessionToken(token)) { return res.send(403); }
	res.send("Token good!");
});

// {
// 	"name": "Ime",
// 	"lastName": "Prezime",
// 	"mail": "mail",
// 	"accType": "account type/ np student",
// 	"tags": []
// }

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