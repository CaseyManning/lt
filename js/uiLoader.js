import * as INDEX from "./index.js";

var startButton = document.getElementById("x");
console.log(INDEX.buildings)
for(var key in INDEX.buildings) {
    var newButton = startButton.cloneNode(false);
    console.log(INDEX.buildings);
    newButton.id = key;
    newButton.onclick = function() {INDEX.buildingPressed(this.id)};
    startButton.parentElement.appendChild(newButton);
}
startButton.parentElement.removeChild(startButton);