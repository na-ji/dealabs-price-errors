import { DealSeeker } from './dealSeeker';

const baseUrls = [{
  url: 'https://www.dealabs.com/discussions/le-topic-des-erreurs-de-prix-1056379',
}, {
  url: 'https://www.dealabs.com/discussions/suivi-erreurs-de-prix-1063390',
  checkUrl: true,
}];

(() => {
  baseUrls.forEach((source) => new DealSeeker(source.url, undefined, source.checkUrl));
})();
