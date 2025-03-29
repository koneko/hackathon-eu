let user_id = localStorage.getItem("STAR_user_id");
let session_id = localStorage.getItem("STAR_session_id");
fetch("/api/verify/session", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		user_id,
		session_id,
	}),
}).then((res) => {
	if (res.status != 200) {
		window.location.href = "/account/login";
	}
});
