const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const APP_ID = "com.aicontentstudio.desktop";
const LICENSE_VERSION = 1;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required input: ${name}`);
  return value;
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizeMachineId(value) {
  const id = value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();

  if (!/^[A-F0-9]{64}$/.test(id)) {
    throw new Error("Machine ID must contain exactly 64 hexadecimal characters.");
  }

  return id.match(/.{1,4}/g).join("-");
}

function safeFilename(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "Customer";
}

function main() {
  const customerName = required("CUSTOMER_NAME");
  const machineId = normalizeMachineId(required("CUSTOMER_MACHINE_ID"));
  const duration = required("LICENSE_DURATION");

  const allowedDurations = ["30", "90", "180", "365", "lifetime"];

  if (!allowedDurations.includes(duration)) {
    throw new Error("Invalid license duration.");
  }

  const privateKeyPem = required("LICENSE_PRIVATE_KEY");
  const privateKey = crypto.createPrivateKey(privateKeyPem);

  if (privateKey.asymmetricKeyType !== "ed25519") {
    throw new Error("The signing key must be an Ed25519 private key.");
  }

  const issuedAt = new Date();
  let expiresAt = null;

  if (duration !== "lifetime") {
    const expiry = new Date(issuedAt);
    expiry.setUTCDate(expiry.getUTCDate() + Number(duration));
    expiresAt = expiry.toISOString();
  }

  const payload = {
    version: LICENSE_VERSION,
    app: APP_ID,
    machineId,
    licensee: customerName,
    issuedAt: issuedAt.toISOString(),
    expiresAt,
    features: ["article-generation", "wordpress-publishing", "image-generation"]
  };

  const payloadText = JSON.stringify(payload);
  const signature = crypto.sign(null, Buffer.from(payloadText), privateKey);

  const activationCode =
    base64url(payloadText) + "." + base64url(signature);

  const outputDirectory = path.join(process.cwd(), "issued-licenses");
  fs.mkdirSync(outputDirectory, { recursive: true });

  const filename =
    safeFilename(customerName) + "-License.txt";

  const outputPath = path.join(outputDirectory, filename);

  const licenseText = [
    "MADCRAVES AI CONTENT STUDIO",
    "CUSTOMER LICENSE",
    "",
    `Customer: ${customerName}`,
    `Machine ID: ${machineId}`,
    `Issued: ${issuedAt.toISOString()}`,
    `Duration: ${duration === "lifetime" ? "Lifetime" : duration + " days"}`,
    `Expires: ${expiresAt || "Never"}`,
    "",
    "ACTIVATION CODE:",
    activationCode,
    ""
  ].join("\n");

  fs.writeFileSync(outputPath, licenseText, { flag: "wx" });

  const summary = [
    "## MadCraves Customer License Generated",
    "",
    `- Customer: ${customerName}`,
    `- Duration: ${duration === "lifetime" ? "Lifetime" : duration + " days"}`,
    `- Expiry: ${expiresAt || "Never"}`,
    "",
    "The activation code is available in the uploaded license artifact."
  ].join("\n");

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
  }

  console.log("Customer license generated successfully.");
  console.log(`File: issued-licenses/${filename}`);
}

try {
  main();
} catch (error) {
  console.error("License generation failed:", error.message);
  process.exit(1);
}
