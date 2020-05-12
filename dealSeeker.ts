import axios from 'axios';
import * as cheerio from 'cheerio';
import Puppeteer from 'puppeteer';
import { sendNotification } from './notificationSender';
import { interval } from './config.json';
const intervalBase = interval;

const selector = 'span.cept-last-page.pagination-page > button';

export class DealSeeker {
  baseUrl;
  checkIfLinkExist;
  interval = 30;
  lastPageUrl = '';
  cache = {};
  puppeteerPage;

  constructor(baseUrl: string, interval = intervalBase, checkIfLinkExist?: boolean) {
    this.baseUrl = baseUrl;
    this.interval = interval;
    this.checkIfLinkExist = checkIfLinkExist;
    Puppeteer.launch({args: ['--no-sandbox']})
      .then((browser) => browser.newPage())
      .then((page) => {
        this.puppeteerPage = page;
        this.runner();
      });
  }

  fetchNewComments = async (firstTime = false) => {
    console.log('Fetching page');
    const lastComments = (async () => {
      try {
        return (await axios.get(this.lastPageUrl)).data;
      } catch (e) {
        return await this.puppeteerPage.evaluate(() => document.body.innerHTML);
      }
    });

    const $ = cheerio.load(lastComments);
    const nextPageElement = $(selector);

    if (nextPageElement.length > 0) {
      await this.getLastPage(this.lastPageUrl);

      return this.fetchNewComments();
    }

    $('.comments-list-item').each((_index, element) => {
      const comment = $(element);

      if (comment.attr('id') in this.cache) {
        return;
      }

      const commentBody = comment.find('.comment-body .userHtml-content');
      const commentText = commentBody.text();
      const dealLinks = commentBody
        .find('a:not(.userHtml-quote-source)')
        .map((_index, element) => {
          return $(element).attr('title');
        })
        .get();
      const commentLink = JSON.parse(
        comment
          .find('.comment-footer button')
          .last()
          .attr('data-popover'),
      ).tplData.url;

      this.cache[comment.attr('id')] = commentText;

      if (firstTime) {
        return;
      }

      if (this.checkIfLinkExist && dealLinks.length === 0) {
        console.log('No link; nothing interesting to see here');
        return;
      }

      console.log(`Sending notification for comment ${comment.attr('id')}`);
      sendNotification({ commentText, dealLinks, commentLink }).catch((error) => {
        console.error(error);
      });
    });
  };

  getLastPage = async (url) => {
    await this.puppeteerPage.goto(url);
    await this.puppeteerPage.click(selector);

    this.lastPageUrl = this.puppeteerPage.url();
  }

  runner = async () => {
    await this.getLastPage(this.baseUrl);

    if (!this.lastPageUrl) {
      console.error('lastPage not found');
      process.exit(1);
    }

    this.fetchNewComments(true).catch((error) => {
      console.error(error);
    });

    setInterval(() => {
      this.fetchNewComments().catch((error) => {
        console.error(error);
        sendNotification({ commentText: 'Error while fetching...' });
      });
    }, this.interval * 1000);
  };
}
