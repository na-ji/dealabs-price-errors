import { DealSeeker } from './dealSeeker';

const baseUrls = [
  'https://www.dealabs.com/discussions/le-topic-des-erreurs-de-prix-1056379',
  'https://www.dealabs.com/discussions/suivi-erreurs-de-prix-1063390',
];

(() => {
  baseUrls.forEach((url) => new DealSeeker(url));
})();
