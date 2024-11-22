require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

module.exports = {
    cloudinary,
    port: process.env.PORT,
    mongodUrl: process.env.MONGO_URL,
    atlasUrl: process.env.AtlasURL,
    jwtSecret: process.env.JWT_SECRET,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    key: Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
    frontendLink: process.env.frontendLink,
};