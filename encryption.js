import crypto from "crypto";
import config from "./config.js";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const { secret_key, secret_iv, encryption_method } = config;

// Check if secret_key, secret_iv and encryption_method exist before proceeding with the encryption/decryption
if (!secret_key || !secret_iv || !encryption_method) {
  throw new Error("secretKey, secretIV, and ecnryptionMethod are required");
}

// Define filename and dirname using Node.js modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set the path for the AESKey.env file
const keyFilePath = path.join(__dirname, "AESKey.env");

// Check if AESKey.env file already exists
fs.access(keyFilePath, fs.constants.F_OK, (err) => {
  if (err) {
    // File doesn't exist, so create it and add generated AES key and IV
    const aesKey = generateAESKey();
    const data = `AES_KEY=${aesKey.key}\nENCRYPTION_IV=${aesKey.encryptionIV}`;

    // Store the AES key and IV inside the AESKey.env file
    fs.writeFile(keyFilePath, data, (err) => {
      if (err) throw err;
      console.log(
        "AESKey.env file created and AES_KEY and ENCRYPTION_IV stored."
      );
    });
  } else {
    console.log("AESKey.env file already exists. Skipping creation.");
  }
});

// Generate secret hash with crypto to use for encryption
function generateAESKey() {
  const key = crypto
    .createHash("sha512")
    .update(secret_key)
    .digest("hex")
    .substring(0, 32);
  const encryptionIV = crypto
    .createHash("sha512")
    .update(secret_iv)
    .digest("hex")
    .substring(0, 16);

  const AESKey = {
    key: key,
    encryptionIV: encryptionIV,
  };

  return AESKey;
}

// Encrypt private key
export function encryptRSAKeys(data) {
  dotenv.config({ path: keyFilePath });

  const key = process.env.AES_KEY;
  const encryptionIV = process.env.ENCRYPTION_IV;

  const cipher = crypto.createCipheriv(encryption_method, key, encryptionIV);
  return Buffer.from(
    cipher.update(data, "utf8", "hex") + cipher.final("hex")
  ).toString("base64"); // Encrypts data and converts to hex and base64
}

// Decrypt private key
export function decryptRSAKeys(encryptedData) {
  dotenv.config({ path: keyFilePath });

  const key = process.env.AES_KEY;
  const encryptionIV = process.env.ENCRYPTION_IV;

  const buff = Buffer.from(encryptedData, "base64");
  const decipher = crypto.createDecipheriv(
    encryption_method,
    key,
    encryptionIV
  );
  return (
    decipher.update(buff.toString("utf8"), "hex", "utf8") +
    decipher.final("utf8")
  ); // Decrypts data and converts to utf8
}
