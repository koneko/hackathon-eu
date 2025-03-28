import express from "express";
import * as dbUtil from "./utils/dbUtil.js"

const app = express();
const port = process.env.port || 3000;

app.use(express.static("public"));
dbUtil.connect()


app.get("/", (req, res) => {
	res.send("Hello, World");
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});

dbUtil.createUser()