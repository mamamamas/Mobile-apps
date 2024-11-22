const crypto = require("crypto");
const algorithm = "aes-256-cbc";
const { key } = require("./config"); // Store in environment variables

if (key.length !== 32) {
    throw new Error("Key must be 32 bytes long");
}

function encrypt(text) {
    if (typeof text !== "string") {
        return text; // Return the original value if it's not a string
    }
    const iv = crypto.randomBytes(16); // Generate random IV for each encryption
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(encryptedText) {


    if (typeof encryptedText !== "string") {
        return encryptedText; // Return the original value if it's not a string
    }

    const parts = encryptedText.split(":");
    if (parts.length !== 2) {
        // Return as plain text if the string doesn't match the expected format
        return encryptedText;
    }

    const [ivHex, encryptedDataHex] = parts;

    if (!ivHex || !encryptedDataHex) {
        throw new Error("Invalid IV or encrypted data");
    }

    const iv = Buffer.from(ivHex, "hex"); // Convert IV from hex to Buffer
    const encryptedData = Buffer.from(encryptedDataHex, "hex"); // Convert encrypted data from hex to Buffer

    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}



const words = "asdasdsad";
const encryptWords = encrypt(words);
console.log("encrypted words: ", encryptWords);
const decryptWords = decrypt(encryptWords);
console.log("decrypted words: ", decryptWords);

module.exports = { encrypt, decrypt };
