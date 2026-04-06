/**
 * Generates RS256 key pair for JWT signing.
 * Run once: npx tsx scripts/generate-keys.ts
 * Copy the output to your .env file.
 */
import { generateKeyPairSync } from "crypto";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

console.log("Add these to your .env file:\n");
console.log(`JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, "\\n")}"`);
console.log();
console.log(`JWT_PUBLIC_KEY="${publicKey.replace(/\n/g, "\\n")}"`);
