import * as config from './config.json';

const exist = Object.keys(config).some((key) => typeof config[key] === 'string');

if (!exist) {
  console.log('\x1b[41m\x1b[30mWARNING : no notification channel set in config file\x1b[0m')
}
