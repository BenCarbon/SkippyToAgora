var path = require('path');
var puppeteer = require('puppeteer');
var request = require('request');
var config = require('./config.json');

var token = '';

if (config.appId == '') {
	console.log('Config is missing app id');
} else if (config.bucket.name == '') {
	console.log('Config is missing bucket info');
} else if (config.authKey == '') {
	console.log('Config is missing auth key');
} else {
	request(`https://uldizaax95.execute-api.us-west-1.amazonaws.com/token?channel=${config.channel}`, function(error, response, body) {
		console.log('Token: ' + body);
		token = body;
		start();
	});
}

async function start() {
	var browser = await puppeteer.launch({args: ['--no-sandbox', '--use-fake-ui-for-media-stream'], headless: true});

	for (var i = 0; i < config.cameras.length; i++) {
		var page = await browser.newPage();
		page.goto(`file://${path.dirname(require.main.filename)}/Agora-Web-Tutorial-1to1-Webpack/build/index.html`, {waitUntil: 'networkidle0'});
		await page.waitForSelector('input#appID');
		await page.type('input#appID', config.appId);
		await page.type('input#channel', config.channel);
		await page.type('input#token', token);

		await page.waitForTimeout(2000);
		await page.click('div.collapsible-header.agora-secondary-bg');

		await page.type('input#uid', config.cameras[i].id.toString());
		
		await page.waitForTimeout(500);
		var cameraSelect = await page.evaluate(() => document.querySelectorAll('input.select-dropdown.dropdown-trigger')[0].dataset.target);

		if (i == 0) {
			console.log('\nCameras:');
			var camCount = await page.$eval(`#${cameraSelect}`, el => el.childElementCount);
			console.log(camCount);
			for (var x = 0; x < camCount; x++) {
				console.log(`${x}: ${await page.$eval(`#${cameraSelect}${x}`, el => el.children[0].innerText)}`);
			}
			console.log('');
			//await page.screenshot({path: "screen.png"});
		}

		if (camCount == 0) {
			console.log("No cameras found");
			return;
		}

		// console.log(cameraSelect);
		await page.waitForTimeout(500);
		var camDropdown = await page.$('.select-dropdown.dropdown-trigger');
		await camDropdown.evaluate(b => b.click());
		await page.waitForTimeout(500);
		var cam = await page.$(`#${cameraSelect}${config.cameras[i].cameraIndex}`);
		await cam.evaluate(c => c.click());

		await page.type('input#cameraResolution', config.cameras[i].stereo ? "1080p_2" : "720p");
		
		await page.evaluate(() => document.querySelector('#join').click());

		console.log(`Streaming camera ${i + 1}`);
		// await page.screenshot({path: "screen.png"});
	}
	record();
}

function record() {
	console.log('');
	var resourceid;

	var aquireBody = {
		cname: config.channel,
		uid: "527841",
		clientRequest: {
			resourceExpiredHour: 24,
			scene: 0
		}
	}

	console.log('Aquiring resource ID...');
	request.post({
		url: `https://api.agora.io/v1/apps/${config.appId}/cloud_recording/acquire`,
		headers: {'content-type': 'application/json;charset=utf-8', 'Authorization': config.authKey},
		body: JSON.stringify(aquireBody)
	}, function(error, response, body) {
		if (response.statusCode == 200) {
			// console.log(JSON.parse(body));
			resourceid = JSON.parse(body).resourceId;
			console.log('Starting recording...');
			startRecording();
		} else {
			console.log('Error!');
			console.log(JSON.parse(body).message);
		}
	});

	function startRecording() {
		var recordBody = {
			uid: "527841",
			cname: config.channel,
			clientRequest: {
				token: token,
				recordingConfig: {
					maxIdleTime: 5,
					streamTypes: 2,
					audioProfile: 1,
					channelType: 0,
					videoStreamType: 0,
					transcodingConfig: {
						height: 1080,
						width: 1920,
						bitrate: 3150,
						fps: 30,
						mixedVideoLayout: 3,
						layoutConfig: [
							{
								uid: "1",
								x_axis: 0.0,
								y_axis: 0.0,
								width: 0.5,
								height: 0.5
							},
							{
								uid: "2",
								x_axis: 0.5,
								y_axis: 0.0,
								width: 0.5,
								height: 0.5
							},
							{
								uid: "3",
								x_axis: 0.0,
								y_axis: 0.5,
								width: 0.5,
								height: 0.5
							},
							{
								uid: "4",
								x_axis: 0.5,
								y_axis: 0.5,
								width: 0.5,
								height: 0.5
							},
						]
					},
					subscribeVideoUids: [
						"1",
						"2",
						"3",
						"4"
					],
					subscribeAudioUids: [
						"1",
						"2",
						"3",
						"4"
					],
					subscribeUidGroup: 0
				},
				recordingFileConfig: {
					avFileType: ["hls", "mp4"] 
				},
				storageConfig: {
					bucket: config.bucket.name,
					region: config.bucket.region,
					accessKey: config.bucket.accessKey,
					secretKey: config.bucket.secretKey,
					vendor: 1,
					fileNamePrefix: [
						config.channel.replace(/[^a-zA-Z0-9]/g, ""),
						new Date().toISOString().substr(0,10).replace(/[^a-zA-Z0-9]/g, ""),
						new Date().toISOString().substr(11,8).replace(/[^a-zA-Z0-9]/g, "")
					]
				}
			}
		}
	
		request.post({
			url: `https://api.agora.io/v1/apps/01c84bffc1d14fe3a6796d4e0726a4cb/cloud_recording/resourceid/${resourceid}/mode/mix/start`,
			headers: {'content-type': 'application/json;charset=utf-8', 'Authorization': config.authKey},
			body: JSON.stringify(recordBody)
		}, function(error, response, body) {
			if (response.statusCode == 200) {
			console.log('Recording started');
				// console.log(response.statusCode);
				// console.log(JSON.parse(body));
				// console.log('resourceId: ' + JSON.parse(body).resourceId);
				// console.log('sid: ' + JSON.parse(body).sid);
			} else {
				console.log('Error!');
				console.log(JSON.parse(body).reason);
			}
		});
	}
}
