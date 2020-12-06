import { DealSeeker } from './dealSeeker';

const baseUrls = [
  {
    threadId: '1056379',
    threadUrl: 'https://www.dealabs.com/discussions/le-topic-des-erreurs-de-prix-1056379',
  },
  {
    threadId: '1063390',
    checkUrl: true,
    threadUrl: 'https://www.dealabs.com/discussions/suivi-erreurs-de-prix-1063390',
  },
];

(() => {
  baseUrls.forEach((source) => new DealSeeker(source.threadId, source.threadUrl, undefined, source.checkUrl));
})();
