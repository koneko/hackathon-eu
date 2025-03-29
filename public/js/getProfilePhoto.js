async function getProfilePhoto(user_id) {
	let result = "";
	let x = await fetch("/pictures/" + user_id + ".png");
	if (x.status != 200) {
		result = "https://hub.koneko.link/cdn/icons/blue.png";
	} else {
		result = "/pictures/" + user_id + ".png";
	}
	return result;
}
