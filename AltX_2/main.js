var video, detector, display, controller, canvas, context, eyecon;
var dw, dh;
var inited = false;

function openEyeCon(){
	eyecon.removeClass("altx-eyecon-close").addClass("altx-eyecon-open");
}

function closeEyeCon(){
	eyecon.removeClass("altx-eyecon-open").addClass("altx-eyecon-close");
}

function ready(){
	var eyeConHTML = "<div id='altx-init' class='altx-eyecon-close'></div>";
	$("body").append(eyeConHTML);
	eyecon = $("#altx-init");
	var ey = $("#nav-logo a").offset().top;
	var ex = $("#nav-logo a").offset().left + $("#nav-logo a").width() + 4;
	
	eyecon.css({"top": ey + "px", "left": ex + "px", "background": "url('"+chrome.extension.getURL("images/eyecon.png")+"')"});
	console.log("setup");
	eyecon.click(function(){
		if (eyecon.hasClass("altx-eyecon-close")){
			stopped = false;
			init();
		}else{
			stop();
		}
	});
	
	eyecon.click();
}

$(window).ready(function(){
	ready();
});
