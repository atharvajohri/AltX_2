function init() {
	inited = true;
	console.log("starting up!");
    video = document.createElement('video');
	console.log($("#centerSlots").length);
    // display = $("#centerSlots").length ? $("#centerSlots") : $("body");
	display = $("body");
	if ($("#altx-controller").length){
		controller = $("#altx-controller");
	}else {
		$("body").append("<div id='altx-controller'></div>");
		controller = $("#altx-controller");
	}
    
	if (!$("#altx-canvas").length){
		canvas = $('<canvas id="altx-canvas" style="position: fixed; z-index: 1001;top: 10px; right: 10px; opacity: 1.0">').get(0);
	}else{
		canvas = $("#altx-canvas")[0];
	}
    context = canvas.getContext('2d');
    
    document.getElementsByTagName('body')[0].appendChild(canvas);
    try {
        compatibility.getUserMedia({
            video: true
        }, function(stream) {
            try {
                video.src = compatibility.URL.createObjectURL(stream);
            } catch (error) {
                video.src = stream;
            }
			openEyeCon();
           compatibility.requestAnimationFrame(play);
        }, function(error) {
            alert("WebRTC not available");
        });
    } catch (error) {
        alert(error);
		stop();
    }
}

function cancelLaunch(){
	clearTimeout(launching);
	controller.css({"opacity": "0.2"});
	launching = null;
}

function hideController(){
	cancelLaunch();
	controller.hide();
	controller.css("opacity", 0.2);
	$("img").removeClass("altx-highlight");
}

function showController(){
	controller.show();
}

var detectTimeout = 0, detectorShown = false, undetectTimeout = 0;
var DETECT_TIMEOUT = 10;

function checkDetector(){
	detectTimeout++;
	if (detectTimeout > DETECT_TIMEOUT){
		detectorShown = true;
		undetectTimeout = 0;
		showController();
	}
}

function clearDetector(){
	undetectTimeout++;
	if (undetectTimeout > DETECT_TIMEOUT){
		detectorShown = false;
		detectTimeout = 0;
		hideController();
	}
}

function updateController(coord){
	/* Draw coordinates on video overlay: */
	controller.css({"right": ((coord[0] / video.videoWidth * dw)) + "px", "top": (coord[1] / video.videoHeight * dh) + "px"});
	controller.css({"width": (coord[2] / video.videoWidth * dw) + "px", "height": (coord[3] / video.videoHeight * dh) + "px"});
}


function scrollWindow(coord){

	var allowMoveTop = controller.position().top < 100;
	var allowMoveBot = (controller.position().top + controller.height()) > (dh - 100);
	
	if (allowMoveBot) {
		window.scrollBy(0, 1 * 10);
	}else if (allowMoveTop){
		window.scrollBy(0, 1 * -10);
	}
	
}

function setPopoverEvents(){

}

var launching = null;

function initiateLaunch(img){
	var couldBeLink = img.closest("a");
	var box = couldBeLink.closest(".feed-carousel-card");
	var $quickLook = $('#gw-quick-look-btn');
	launching = setTimeout(function(){
		box.append($quickLook);$quickLook.trigger("click");
		controller.css({"opacity": "0.2"});
	}, 2700);
	controller.stop().animate({"opacity": "0.9"}, 2500);
}

var deh_co = 0, prev_img = null;
function selectElement(coord){
	
	deh_co++;
	//get all image containers viewable screen
	var images = $("img").filter(":onScreen");	
	//find the image which contains our controller
	var cx = controller.offset().left;
	var cy = controller.offset().top;
	var cw = controller.width();
	var ch = controller.height();
	images.each(function(){
		var img = $(this);
		var ix = img.offset().left;
		var iy = img.offset().top;
		var iw = img.width();
		var ih = img.height();
		
		if (
			ix > cx && ((ix + iw) < (cx + cw)) &&
			iy > cy && ((iy + ih) < (cy + ch))
		){
			$("img").removeClass("altx-highlight");
			if (prev_img !== img.closest("a").attr("href")){
				cancelLaunch();
				initiateLaunch(img);
			}
			prev_img = img.closest("a").attr("href");
			img.addClass("altx-highlight");
			deh_co = 0;
		}
	});
	
	if (deh_co >= 20){
		$("img").removeClass("altx-highlight");
		deh_co = 0;
	}
	
	// var $ele = $(document.elementFromPoint(px, py));
	// $ele && (console.log($ele));
	// if ($ele && $ele.parents(".imageContainer").length){
		// $ele.closest(".imageContainer").addClass("altx-highlight");
	// }else{
		// if (deh_co >= 100){
			// $(".imageContainer").removeClass("altx-highlight");
			// deh_co = 0;
		// }
	// }
	
}

function performActions(coord){
	scrollWindow(coord);
	selectElement(coord);
}

function moveToCart(){
	
}

function parseCoords(coords){
	if (coords[0]){
		checkDetector();
		if (detectorShown){
	        var coord = coords[0];
	        coord[0] *= video.videoWidth / detector.canvas.width;
	        coord[1] *= video.videoHeight / detector.canvas.height;
	        coord[2] *= video.videoWidth / detector.canvas.width;
	        coord[3] *= video.videoHeight / detector.canvas.height;

			/* confidence bruh*/
			var coord = coords[0];
			for (var i = coords.length - 1; i >= 0; --i){
				if (coords[i][4] > coord[4]) coord = coords[i];
			}
			
	        updateController(coords[0]);
			performActions(coords[0]);
		}
	} else{
    	clearDetector();
    }
}

function play() {
	if (stopped) return;
    compatibility.requestAnimationFrame(play);
    if (video.paused)
        video.play();

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {

        if (!detector) {
            var width = ~~(80 * video.videoWidth / video.videoHeight);
            var height = 80;
            detector = new objectdetect.detector(width, height, 1.1, objectdetect.handfist);
        }

        canvas.width = ~~(100 * video.videoWidth / video.videoHeight);
		canvas.height = 100;
		
		context.translate(canvas.clientWidth, 0);
		context.scale(-1, 1);
		context.drawImage(video, 0, 0, canvas.clientWidth, canvas.clientHeight);
        
        /* Draw video overlay: */
        display.css("height", $(window).height());
        display.css("width", $(window).width());//~~(display.height() * video.videoWidth / video.videoHeight));
        dw = display.width();
        dh = display.height();
        
        var coords = detector.detect(video, 1);
        parseCoords(coords);
    }
}

function stop(){
	stopped = true;
	$("#altx-canvas").addClass("hide");
	hideController();
	closeEyeCon();
	video.pause();
	video.src = "";
}