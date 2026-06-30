// Must be imported BEFORE @solana/web3.js anywhere in the app.
// React Native lacks the Web Crypto + Buffer globals web3.js relies on.
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { Buffer } from "buffer";

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}
