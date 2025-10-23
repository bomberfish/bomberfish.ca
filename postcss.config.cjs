const postCssPresetEnv = require('postcss-preset-env');
const autoprefixer = require('autoprefixer');

module.exports = {
  plugins: [
    postCssPresetEnv({
      features: {},
      browsers: ['>= 0.00%'],
      stage: 0,
    }),
    autoprefixer({
      overrideBrowserslist: ['>= 0.00%'],
      grid: 'autoplace',
    }),
  ],
};
