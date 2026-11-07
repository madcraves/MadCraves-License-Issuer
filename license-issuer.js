
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const APP_ID = "com.aicontentstudio.desktop";
const LICENSE_VERSION = 1;

const PRIVATE_KEY_PATH = path.join(
  __dirname,
  "ACS-License-Private-Key.pem"
);

const OUTPUT_DIR = path.join(__dirname, "issued-licenses");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

function normalizeMachineId(value) {
  const normalized = value
    .replace(/[\s-]/g, "")
    .toUpperCase();

  if (!/^[A-F0-9]{64}$/.test(normalized)) {
    throw new Error(
      "Invalid Machine ID. It must contain exactly 64 hexadecimal characters."
    );
  }

  return normalized.match(/.{1,4}/g).join("-");
}

async function main() {
  try {
    console.log("\n====================================");
    console.log("     MADCRAVES LICENSE ISSUER");
    console.log("====================================\n");

    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
      throw new Error(
        "ACS-License-Private-Key.pem not found!"
      );
    }

    const privateKey = crypto.createPrivateKey(
      fs.readFileSync(PRIVATE_KEY_PATH, "utf8")
    );

    if (privateKey.asymmetricKeyType !== "ed25519") {
      throw new Error("Private key must be Ed25519.");
    }

    const machineInput = await ask(
      "Enter Customer Machine ID: "
    );

    const machineId = normalizeMachineId(machineInput);

    const licensee = await ask(
      "Enter Customer Name: "
    );

    if (!licensee) {
      throw new Error("Customer name cannot be empty.");
    }

    const payload = {
      version: LICENSE_VERSION,
      app: APP_ID,
      machineId,
      licensee,
      issuedAt: new Date().toISOString(),
      features: [
        "article-generation",
        "wordpress-publishing",
        "seo-tools",
        "image-generation"
      ]
    };

    const payloadBytes = Buffer.from(
      JSON.stringify(payload),
      "utf8"
    );

    const signature = crypto.sign(
      null,
      payloadBytes,
      privateKey
    );

    const activationCode =
      payloadBytes.toString("base64url") +
      "." +
      signature.toString("base64url");

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const safeName = licensee
      .replace(/[^a-z0-9-_]/gi, "_")
      .slice(0, 50);

    const fileName = `${safeName || "Customer"}-License.txt`;

    const outputPath = path.join(
      OUTPUT_DIR,
      fileName
    );

    fs.writeFileSync(
      outputPath,
      [
        "MADCRAVES AI CONTENT STUDIO",
        "CUSTOMER ACTIVATION LICENSE",
        "",
        `Customer: ${licensee}`,
        `Machine ID: ${machineId}`,
        `Issued: ${payload.issuedAt}`,
        "",
        "ACTIVATION CODE:",
        activationCode,
        ""
      ].join("\n"),
      "utf8"
    );

    console.log("\n====================================");
    console.log("       LICENSE GENERATED!");
    console.log("====================================");
    console.log("\nCustomer:", licensee);
    console.log("Machine ID:", machineId);
    console.log("\nActivation Code:\n");
    console.log(activationCode);
    console.log("\nSaved file:");
    console.log(outputPath);

  } catch (error) {
    console.error("\nERROR:", error.message);
  } finally {
    rl.close();
  }
}

main();
