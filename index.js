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

		await page.waitForTimeout(2000);
		await page.click('div.collapsible-header.agora-secondary-bg');

		await page.type('input#uid', config.cameras[i].id.toString());
		
		await page.waitForTimeout(500);
		var cameraSelect = await page.evaluate(() => document.querySelectorAll('input.select-dropdown.dropdown-trigger')[0].dataset.target);
		var micSelect = await page.evaluate(() => document.querySelectorAll('input.select-dropdown.dropdown-trigger')[1].dataset.target);

		if (i == 0) {
			console.log('\nCameras:');
			var camCount = await page.$eval(`#${cameraSelect}`, el => el.childElementCount);
			// console.log(camCount);
			for (var x = 0; x < camCount; x++) {
				console.log(`${x}: ${await page.$eval(`#${cameraSelect}${x}`, el => el.children[0].innerText)}`);
			}
			console.log('');

			console.log('\Mics:');
			var micCount = await page.$eval(`#${micSelect}`, el => el.childElementCount);
			// console.log(camCount);
			for (var x = 0; x < micCount; x++) {
				console.log(`${x}: ${await page.$eval(`#${micSelect}${x}`, el => el.children[0].innerText)}`);
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

		if (config.cameras[i].micIndex != null) {
			var micDropdown = (await page.$$('.select-dropdown.dropdown-trigger'))[1];
			await micDropdown.evaluate(b => b.click());
			await page.waitForTimeout(500);
			var mic = await page.$(`#${micSelect}${config.cameras[i].micIndex}`);
			await mic.evaluate(m => m.click());

			await page.evaluate(() => document.querySelector('#joinAudio').click());
		} else {
			await page.evaluate(() => document.querySelector('#join').click());
		}

		console.log(`Streaming camera ${i + 1}`);
		// await page.screenshot({path: "screen.png"});
	}
}
