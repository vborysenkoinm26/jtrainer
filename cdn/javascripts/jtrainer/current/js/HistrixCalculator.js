$(document).ready(function(){
    $('#myCalc').mousedown(function(){
        var str = $('span#total').text();
        var fontSize = parseInt($('div#answer').css('font-size'));
        if(str.length == 19) {
            $('div#answer').css('font-size', (fontSize - 2)+'px');
        } else if(str.length == 38) {
            $('div#answer').css('font-size', (fontSize - 4)+'px');
        }
    });
});
function input(sun) {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    x.innerHTML += sun;
    y.innerHTML += sun;
}

function factorial(shirious) {
    if (Number.isInteger(shirious)) {
        if (shirious < 2) return 1;
        return shirious * factorial(shirious - 1);
    }
}

function sqrt() {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    x.innerHTML += "sqrt(";
    y.innerHTML += (/[\d)IE]/.test(y.innerHTML.slice(-1))) ? " * Math.sqrt(" : "Math.sqrt(";
}

function leftParen() {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    x.innerHTML += "(";
    y.innerHTML += (/[\d)IE]/.test(y.innerHTML.slice(-1))) ? " * (" : "(";
}

function piOrE(lunar) {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    if (lunar == "pi") {
        x.innerHTML += "\u03C0";
        y.innerHTML += (/[\d)IE]/.test(y.innerHTML.slice(-1))) ? " * Math.PI" : "Math.PI";
    } else {
        x.innerHTML += "\u0065";
        y.innerHTML += (/[\d)IE]/.test(y.innerHTML.slice(-1))) ? " * Math.E" : "Math.E";
    }
}

function log(jafca) {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    if (jafca == 1) {
        x.innerHTML += "log(";
        y.innerHTML += (/[\d)IE]/.test(y.innerHTML.slice(-1))) ? " * Math.log10(" : "Math.log10(";
    } else {
        x.innerHTML += "ln(";
        y.innerHTML += (/[\d)IE]/.test(y.innerHTML.slice(-1))) ? " * Math.log(" : "Math.log(";
    }
}

function trigo(hatsyrei) {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    x.innerHTML += hatsyrei + "(";
    y.innerHTML += (/[\d)IE]/.test(y.innerHTML.slice(-1))) ? " * Math." + hatsyrei + "(Math.PI / 180 * " : "Math." + hatsyrei + "(Math.PI / 180 * ";
}

function trigo1(valentin) {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    x.innerHTML += valentin + "\u207B\u00B9(";
    y.innerHTML += (/[\d)IE]/.test(y.innerHTML.slice(-1))) ? " * 180 / Math.PI * Math.a" + valentin + "(" : "180 / Math.PI * Math.a" + valentin + "(";
}

function multOrDiv(edward) {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    if (edward == "mult") {
        x.innerHTML += "\u00D7";
        y.innerHTML += "*";
    } else {
        x.innerHTML += "\u00F7";
        y.innerHTML += "/";
    }
}

function del() {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    var z = document.getElementById("myAns");
    if (x.innerHTML.slice(-3) == "Ans") {
        y.innerHTML = (/[\d)IE]/.test(x.innerHTML.slice(-4, -3))) ? y.innerHTML.slice(0, -(z.innerHTML.length + 3)) : y.innerHTML.slice(0, -(z.innerHTML.length));
        x.innerHTML = x.innerHTML.slice(0, -3);
    } else if (x.innerHTML == "Error!") {
        ac();
    } else {
        switch (y.innerHTML.slice(-2)) {
            case "* ": // sin cos tan
            y.innerHTML = (/[\d)IE]/.test(x.innerHTML.slice(-5, -4))) ? y.innerHTML.slice(0, -28) : y.innerHTML.slice(0, -25);
            x.innerHTML = x.innerHTML.slice(0, -4);
            break;
            case "n(":
            case "s(": // asin acos atan
            y.innerHTML = (/[\d)IE]/.test(x.innerHTML.slice(-7, -6))) ? y.innerHTML.slice(0, -29) : y.innerHTML.slice(0, -26);
            x.innerHTML = x.innerHTML.slice(0, -6);
            break;
            case "0(": // log
            y.innerHTML = (/[\d)IE]/.test(x.innerHTML.slice(-5, -4))) ? y.innerHTML.slice(0, -14) : y.innerHTML.slice(0, -11);
            x.innerHTML = x.innerHTML.slice(0, -4);
            break;
            case "g(": // ln
            y.innerHTML = (/[\d)IE]/.test(x.innerHTML.slice(-4, -3))) ? y.innerHTML.slice(0, -12) : y.innerHTML.slice(0, -9);
            x.innerHTML = x.innerHTML.slice(0, -3);
            break;
            case "t(": // sqrt
            y.innerHTML = (/[\d)IE]/.test(x.innerHTML.slice(-6, -5))) ? y.innerHTML.slice(0, -13) : y.innerHTML.slice(0, -10);
            x.innerHTML = x.innerHTML.slice(0, -5);
            break;
            case "PI": // pi
            y.innerHTML = (/[\d)IE]/.test(x.innerHTML.slice(-2, -1))) ? y.innerHTML.slice(0, -10) : y.innerHTML.slice(0, -7);
            x.innerHTML = x.innerHTML.slice(0, -1);
            break;
            case ".E": // e
            y.innerHTML = (/[\d)IE]/.test(x.innerHTML.slice(-2, -1))) ? y.innerHTML.slice(0, -9) : y.innerHTML.slice(0, -6);
            x.innerHTML = x.innerHTML.slice(0, -1);
            break;
            default:
            y.innerHTML = y.innerHTML.slice(0, -1);
            x.innerHTML = x.innerHTML.slice(0, -1);
        }
    }
}

function ac() {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    x.innerHTML = y.innerHTML = "";
}

function ans() {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    var z = document.getElementById("myAns");
    x.innerHTML += "Ans";
    y.innerHTML += (/[\d)IE]/.test(y.innerHTML.slice(-1))) ? " * " + z.innerHTML : z.innerHTML;
}

function equal() {
    var x = document.getElementById("total");
    var y = document.getElementById("expr");
    var z = document.getElementById("myAns");
    for (var i = 0; i < (x.innerHTML.split("(").length - x.innerHTML.split(")").length); i++) {
        y.innerHTML += ")";
    }
    if (y.innerHTML != "") {
        x.innerHTML = y.innerHTML = z.innerHTML = eval(y.innerHTML.replace(/(\d+\.?\d*)\!/g, "factorial($1)").replace('^', "**"));
    }
    if (!isFinite(x.innerHTML)) x.innerHTML = "Error!";
}