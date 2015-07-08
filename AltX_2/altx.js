var OPEN_LOG = true;
var altx_fist_pos_old;
var altx_detector;
var altx_canvas;
var altx_context;
var altx_video;

function logger(logtext){
	OPEN_LOG && console.log(logtext);
}

function checkVideoFeatures(callback){
	initGlobals();
	try {
		compatibility.getUserMedia({video: true}, function(stream) {
			try {
				altx_video.src = compatibility.URL.createObjectURL(stream);
			} catch (error) {
				altx_video.src = stream;
			}
			compatibility.requestAnimationFrame(callback);
		}, function (error) {
			alert("WebRTC not available");
		});
	} catch (error) {
		alert(error);
	}
}

function createDOMElements(){
	$("body").append(
		'<div id="altx-cursor"></div>' +
		'<canvas id="altx-canvas-source" style="position: fixed; z-index: 1001;top: 0px; left: 0px; opacity: 0.9">' +
		'<video id="altx-video"></video>'
	);
	
	$("#altx-canvas-source").attr("width", $(window).width());
	$("#altx-canvas-source").attr("height", $(window).height());
}

function initGlobals(){
	createDOMElements();
	altx_canvas = document.getElementById('altx-canvas-source');
	altx_context = altx_canvas.getContext('2d');
	altx_video = document.getElementById('altx-video');
}

var altx_close_detector;
var altx_open_detector;

function play() {
	compatibility.requestAnimationFrame(play);
	if (altx_video.paused) altx_video.play();
	
	if (altx_video.readyState === altx_video.HAVE_ENOUGH_DATA && altx_video.videoWidth > 0) {
		
		/* Prepare the detector once the video dimensions are known: */
		if (!altx_close_detector) {
			var width = ~~(80 * altx_video.videoWidth / altx_video.videoHeight);
			var height = 80;
			altx_close_detector = new objectdetect.detector(width, height, 1.1, objectdetect.handfist);
		}
		
		var coords = altx_close_detector.detect(altx_video, 1);
		handleCloseFound(coords);
				
		/*if (!altx_open_detector) {
			var width = ~~(80 * altx_video.videoWidth / altx_video.videoHeight);
			var height = 80;
			altx_open_detector = new objectdetect.detector(width, height, 1.1, objectdetect.handopen);
		}
		
		var opencoords = altx_open_detector.detect(altx_video, 1);
		if (opencoords[0]) {
			handleOpenFound(opencoords[0]);
		}*/
	}
}

function handleCloseFound(coords){
	console.log("Close at: " + coords[0]);
	var altx_detector = altx_close_detector;
	if (coords[0]) {
		var coord = coords[0];
		
		/* Rescale coordinates from detector to video coordinate space: */
		coord[0] *= altx_video.videoWidth / altx_detector.canvas.width;
		coord[1] *= altx_video.videoHeight / altx_detector.canvas.height;
		coord[2] *= altx_video.videoWidth / altx_detector.canvas.width;
		coord[3] *= altx_video.videoHeight / altx_detector.canvas.height;
	
		/* Find coordinates with maximum confidence: */
		var coord = coords[0];
		for (var i = coords.length - 1; i >= 0; --i)
			if (coords[i][4] > coord[4]) coord = coords[i];
		
		/* Scroll window: */
		var fist_pos = [coord[0] + coord[2] / 2, coord[1] + coord[3] / 2];
		if (altx_fist_pos_old) {
			var dx = (fist_pos[0] - altx_fist_pos_old[0]) / altx_video.videoWidth,
					dy = (fist_pos[1] - altx_fist_pos_old[1]) / altx_video.videoHeight;
			
				window.scrollBy(dx * 200, dy * 200);
		} else altx_fist_pos_old = fist_pos;
		
		/* Draw coordinates on video overlay: */
		altx_context.beginPath();
		altx_context.lineWidth = '2';
		altx_context.fillStyle = 'rgba(0, 255, 255, 0.5)';
		altx_context.fillRect(
			coord[0] / altx_video.videoWidth * altx_canvas.clientWidth,
			coord[1] / altx_video.videoHeight * altx_canvas.clientHeight,
			coord[2] / altx_video.videoWidth * altx_canvas.clientWidth,
			coord[3] / altx_video.videoHeight * altx_canvas.clientHeight);
		altx_context.stroke();
	} else fist_pos_old = null;
}

function handleOpenFound(cx){
	console.log("Open at: " + cx);
}

function init(){
	checkVideoFeatures(play);
}

init();
