require('colors');
const puppeteer = require('puppeteer');

const config = require('../config/config.js');


class HeadlessBrowser {

    constructor() {
        this.launchBrowser();
    }

    async launchBrowser() {
        console.log('Launching headless browser');
        this.browser = await puppeteer.launch({
            ignoreDefaultArgs: ['--disable-extensions'],
            chromeFlags: [
                '--disable-gpu',
                '--headless'
            ],
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Headless browser ready', !!this.browser);
    }

    async goto(path) {
        if(this.browser!=null && this.browser!=='undefined')
        {
          const page = await this.browser.newPage();
          const fullpath = `https://${config.domain}/${path}`;
          console.log(`test start at ${fullpath}`);
          const pageResult = await page.goto(fullpath);
          page.on('pageerror', this.pageerror.bind(this));
          return page;
        }
        return null;
    }
    pageerror(err) {
        console.log('Puppeteer page error'.bgRed, err);
    }
}

module.exports = { HeadlessBrowser };
