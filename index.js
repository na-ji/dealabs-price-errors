const axios = require('axios');
const cheerio = require('cheerio');
const { discordWebhook, telegramToken, telegramChatId, interval } = require('./config');

const baseUrl = 'https://www.dealabs.com/discussions/le-topic-des-erreurs-de-prix-1056379';
let lastPageUrl = '';
const cache = {};

const sendNotification = async ({ commentText, dealLinks, commentLink }) => {
  const output = `${commentText}\n\n${dealLinks.join('\n')}\n\n${commentLink}`;

  if (discordWebhook && discordWebhook !== '') {
    await axios.post(discordWebhook, {
      username: 'Dealabs Price Error',
      avatar_url: 'https://www.dealabs.com/favicon.ico',
      content: output,
    });
  }

  if (telegramToken && telegramToken !== '' && telegramChatId && telegramChatId !== '') {
    await axios.get(
      `https://api.telegram.org/bot${telegramToken}/sendMessage?chat_id=${telegramChatId}&parse_mode=markdown&text=${escape(
        output,
      )}`,
    );
  }
};

const fetchNewComments = async (firstTime = false) => {
  console.log('Fetching page');
  const lastComments = await axios.get(lastPageUrl);

  const $ = cheerio.load(lastComments.data);
  const nextPageElement = $('a.pagination-next');

  if (nextPageElement.length > 0) {
    lastPageUrl = nextPageElement.attr('href');
    console.log('New page detected: ' + lastPageUrl);

    return fetchNewComments();
  }

  $('.comments-list-item').each((_index, element) => {
    const comment = $(element);

    if (comment.attr('id') in cache) {
      return;
    }

    const commentBody = comment.find('.comment-body .userHtml-content');
    const commentText = commentBody.text();
    const dealLinks = commentBody
      .find('a')
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

    cache[comment.attr('id')] = commentText;

    if (firstTime) {
      return;
    }

    console.log(`Sending notification for comment ${comment.attr('id')}`);
    sendNotification({ commentText, dealLinks, commentLink }).catch((error) => {
      console.error(error);
    });
  });
};

(async () => {
  const topicPage = await axios.get(baseUrl);

  const $ = cheerio.load(topicPage.data);
  lastPageUrl = $('a.cept-last-page').attr('href');

  if (!lastPageUrl) {
    console.error('lastPage not found');
    process.exit(1);
  }

  fetchNewComments(true).catch((error) => {
    console.error(error);
  });

  setInterval(() => {
    fetchNewComments().catch((error) => {
      console.error(error);
    });
  }, interval * 1000);
})();
