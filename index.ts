import { DealSeeker } from './dealSeeker';

const baseUrls = [
  {
    threadId: '1056379',
  },
  {
    threadId: '1063390',
    checkUrl: true,
  },
];

(() => {
  baseUrls.forEach((source) => new DealSeeker(source.threadId, undefined, source.checkUrl));
})();
