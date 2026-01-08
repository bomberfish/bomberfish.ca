const postCssPresetEnv = require('postcss-preset-env');
const cssnanoPlugin = require('cssnano');
const cssnanoPlugin = require('cssnano');
const litePreset = require('cssnano-preset-lite');
const calc = require('postcss-calc');
const normalizeCharset = require('postcss-normalize-charset');
const mergeLonghand = require('postcss-merge-longhand');
const discardComments = require('postcss-discard-comments');
const svgo = require('postcss-svgo');
const uniqueSelectors = require('postcss-unique-selectors');
const convertValues = require('postcss-convert-values');
const cssDeclarationSorter = require('css-declaration-sorter');
const mergeRules = require('postcss-merge-rules');
const minifyParams = require('postcss-minify-params');
const minifySelectors = require('postcss-minify-selectors');

module.exports = {
  plugins: [
    postCssPresetEnv({
              features: {},
              browsers: [">= 0.00%"],
              stage: 2,
              autoprefixer: {
                overrideBrowserslist: [">= 0.00%"],
                grid: "autoplace",
                remove: false,
              },
            }),
            cssnanoPlugin({
              preset: litePreset,
              plugins: [
                calc, 
                normalizeCharset, 
                mergeLonghand, 
                discardComments, 
                svgo, 
                uniqueSelectors, 
                convertValues, 
                cssDeclarationSorter, 
                mergeRules, 
                minifyParams, 
                minifySelectors
              ],
            })
  ],
};
