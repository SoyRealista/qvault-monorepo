// Standard Expo Metro config. Runtime polyfills (Buffer, getRandomValues, URL)
// are installed in src/polyfills.ts, imported first from index.ts — that's all
// @solana/web3.js needs under React Native for reads + transaction building.
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
