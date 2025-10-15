// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-3.0
console.log("OwO what's this");
function updateTop() {
	var topInput = document.getElementById("topInput");
	var topText = document.getElementById("topText");
	topText.innerHTML = topInput.value;
}

function updateBottom() {
	var bottomInput = document.getElementById("bottomInput");
	var bottomText = document.getElementById("bottomText");
	bottomText.innerHTML = bottomInput.value;
}

function updateImg() {
	var img = document.querySelector("img");
	var file = document.querySelector("input[type=file]").files[0];
	img.src = window.URL.createObjectURL(file);
}
// @license-end
