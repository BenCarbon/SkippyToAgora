var http = require('http');
var path = require('path');
var puppeteer = require('puppeteer');
var fetch = require('fetch');
var config = require('./config.json');

var appId = '01c84bffc1d14fe3a6796d4e0726a4cb';
var token = '';

fetch.fetchUrl(`https://uldizaax95.execute-api.us-west-1.amazonaws.com/token?channel=${config.channel}`, function(err, meta, body){
	console.log("token:", body.toString());
	token = body.toString();

	start();
});

async function start() {
	var browser = await puppeteer.launch({args: ['--no-sandbox', '--use-fake-ui-for-media-stream'], headless: true});

	for (var i = 0; i < config.cameras.length; i++) {
		var page = await browser.newPage();
		page.goto(`file://${path.dirname(require.main.filename)}/Agora-Web-Tutorial-1to1-Webpack/build/index.html`, {waitUntil: 'networkidle0'});
		await page.waitForSelector('input#appID');
		await page.type('input#appID', appId);
		await page.type('input#channel', config.channel);
		await page.type('input#token', token);

		await page.waitForTimeout(500);
		await page.click('div.collapsible-header.agora-secondary-bg');
		await page.type('input#uid', config.cameras[i].id.toString());
		
		var cameraSelect = await page.evaluate(() => document.querySelectorAll('input.select-dropdown.dropdown-trigger')[0].dataset.target);

		if (i == 0) {
			console.log('\nCameras:');
			var camCount = await page.$eval(`#${cameraSelect}`, el => el.childElementCount);
			for (var x = 0; x < camCount; x++) {
				console.log(`${x}: ${await page.$eval(`#${cameraSelect}${x}`, el => el.children[0].innerText)}`);
			}
			console.log('');
		}

		if (camCount == 0) {
			console.log("No cameras found");
			return;
		}

		// console.log(cameraSelect);
		await page.waitForTimeout(500);
		await page.click(`[data-target="${cameraSelect}"]`);
		await page.waitForTimeout(500);
		await page.click(`#${cameraSelect}${config.cameras[i].cameraIndex}`);

		// var resSelect = await page.evaluate(() => document.querySelectorAll('input.select-dropdown.dropdown-trigger')[1].dataset.target);
		// // console.log(resSelect);
		// await page.waitForTimeout(500);
		// await page.click(`[data-target="${resSelect}"]`);
		// await page.waitForTimeout(500);
		// await page.click(`#${resSelect}3`);
		await page.type('input#cameraResolution', config.cameras[i].stereo ? "1080p_2" : "720p");
		
		await page.evaluate(() => document.querySelector('#join').click());

		console.log(`Streaming camera ${i + 1}`);
	}
}
