import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import tough from 'tough-cookie';
import { sendNotification } from './notificationSender';
import { interval } from './config.json';
import { GraphQLResponse } from './model';
const intervalBase = interval;

const http = axios.create({ withCredentials: true });

axiosCookieJarSupport(http);
http.defaults.jar = new tough.CookieJar();

const graphQlQuery = `
  query comments($filter: CommentFilter!, $limit: Int, $page: Int) {
    comments(filter: $filter, limit: $limit, page: $page) {
      items {
        ...commentFields
      }
      pagination {
        ...paginationFields
      }
    }
  }

  fragment commentFields on Comment {
    commentId
    threadId
    url
    preparedHtmlContent
    likes
  }

  fragment paginationFields on Pagination {
    count
    current
    last
    next
    previous
  }
`;

const apiUrl = 'https://www.dealabs.com/graphql';

const turndownService = new TurndownService();

turndownService.addRule('strikethrough', {
  filter: function(node, options) {
    return options.linkStyle === 'inlined' && node.nodeName === 'A' && !!node.getAttribute('href');
  },
  replacement: function(content, node) {
    // @ts-ignore
    const href = node.getAttribute('href');
    return `<${href}|${content}>`;
  },
});

export class DealSeeker {
  threadId;
  checkIfLinkExist;
  interval = 30;
  lastPage = 0;
  cache = {};

  constructor(threadId: string, interval = intervalBase, checkIfLinkExist?: boolean) {
    this.threadId = threadId;
    this.interval = interval;
    this.checkIfLinkExist = checkIfLinkExist;

    http.get(`https://www.dealabs.com/discussions/suivi-erreurs-de-prix-${this.threadId}`).then(() => {
      void this.runner();
    });
  }

  queryApi = async (page = 1, hasError = false): Promise<GraphQLResponse> => {
    try {
      return (
        await http.post<GraphQLResponse>(apiUrl, {
          query: graphQlQuery,
          variables: { filter: { threadId: { eq: this.threadId }, order: null }, page },
        })
      ).data;
    } catch (err) {
      const error = err as AxiosError;

      if (error.response.status === 418 && !hasError) {
        console.log('Teapot detected, renewing cookies');
        await http.get(`https://www.dealabs.com/discussions/suivi-erreurs-de-prix-${this.threadId}`);

        return this.queryApi(page, true);
      }

      throw error;
    }
  };

  fetchNewComments = async (firstTime = false) => {
    console.log(`Fetching page #${this.lastPage} of thread #${this.threadId}`);

    const response = await this.queryApi(this.lastPage);

    if (response.data.comments.pagination.next) {
      console.info('Get next page...');
      this.lastPage = response.data.comments.pagination.last;

      return this.fetchNewComments();
    }

    const { items: comments } = response.data.comments;

    comments.forEach((comment) => {
      if (comment.commentId in this.cache) {
        return;
      }

      const $ = cheerio.load(`<comment>${comment.preparedHtmlContent}</comment>`);
      const commentBody = $('comment');
      const commentText = turndownService.turndown(comment.preparedHtmlContent);
      const dealLinks = commentBody
        .find('a:not(.userHtml-quote-source)')
        .map((_index, element) => {
          return $(element).attr('title');
        })
        .get();
      const commentLink = `https://www.dealabs.com/comments/permalink/${comment.commentId}`;

      this.cache[comment.commentId] = commentText;

      if (firstTime) {
        return;
      }

      if (this.checkIfLinkExist && dealLinks.length === 0) {
        console.log('No link; nothing interesting to see here');
        return;
      }

      console.log(`Sending notification for comment ${comment.commentId}`);

      sendNotification({ commentText, dealLinks, commentLink }).catch((error) => {
        console.error(error);
      });
    });
  };

  getLastPage = async () => {
    const response = await this.queryApi();

    this.lastPage = response.data.comments.pagination.last;
  };

  runner = async () => {
    await this.getLastPage();

    if (!this.lastPage) {
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
