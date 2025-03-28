import express from "express";
import bodyParser from "body-parser";
import * as dbUtil from "./utils/dbUtil.js"

const app = express();
const port = process.env.port || 3000;

app.use(express.static("public"));
app.use(bodyParser.json());

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

app.get("/mkAcc", async (req, res) => {
	let usr = await dbUtil.createUser("Marko", "Markic", "marko@mail.com", "Student", ["c#", "C++"]);
	let kita2 = await dbUtil.createSession(usr);
	let kita = (await dbUtil.validateEmailCode(usr.usr_id, kita2.mail_code)).toString()
	res.send(kita2.session_id);
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});