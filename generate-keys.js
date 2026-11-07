const crypto = require("node:crypto");
const fs = require("node:fs");

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

fs.writeFileSync("ACS-License-Private-Key.pem", privateKey);
fs.writeFileSync("ACS-License-Public-Key.pem", publicKey);

console.log("MadCraves License Keys Generated Successfully!");
console.log("Keep your PRIVATE key secret.");
console.log("Public key:");
console.log(publicKey);
