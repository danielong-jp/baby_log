function poop(index) {
    let val = document.getElementById("poop_" + index).value;
    console.log(val);
    if (val === "💩") {
        document.getElementById("poop_" + index).value = "";
    } else {
        document.getElementById("poop_" + index).value= "💩";
    }

}

function pee(index) {
    let val = document.getElementById("pee_" + index).value;
    console.log(val);
    if (val === "💦") {
        document.getElementById("pee_" + index).value = "";
    } else {
        document.getElementById("pee_" + index).value= "💦";
    }

}

function sleep(index) {
    let val = document.getElementById("sleep_" + index).value;
    console.log(val);
    if (val === "💤") {
        document.getElementById("sleep_" + index).value = "";
    } else {
        document.getElementById("sleep_" + index).value= "💤";
    }

}
