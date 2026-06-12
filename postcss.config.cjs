const postCssPresetEnv = require('postcss-preset-env');
const cssnanoPlugin = require('cssnano');
const litePreset = require('cssnano-preset-lite');
const calc = require('postcss-calc');
const normalizeCharset = require('postcss-normalize-charset');
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
                // NOTE: postcss-merge-longhand intentionally omitted — it strips
                // `font-variation-settings` declarations that use custom axes
                // (e.g. "ELSH") when sibling `font-weight`/`font-stretch`/`font-style`
                // are present, breaking variable-font styling (see h1 ELSH axis on GeistPixel).
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
