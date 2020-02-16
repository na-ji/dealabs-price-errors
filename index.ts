import { DealSeeker } from './dealSeeker';

const baseUrls = [
  'https://www.dealabs.com/discussions/le-topic-des-erreurs-de-prix-1056379',
];

(() => {
  baseUrls.forEach((url) => new DealSeeker(url));
})();
