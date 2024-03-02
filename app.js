const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const fs = require("fs");
const readline = require("readline");
require("dotenv").config();

const { clientId, clientSecret, redirectUrl } = require("./secrets");

const app = express();
app.use(cors());
app.use(express.json());

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtubepartner",
];

const TOKEN_DIR =
  (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
  "/.credentials/";
const TOKEN_PATH = TOKEN_DIR + "youtube-nodejs-quickstart.json";

// OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUrl
);

function authorize(callback) {
  console.log("In authorize: ");

  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      getNewToken(callback);
    } else {
      oauth2Client.setCredentials(JSON.parse(token));
      callback(oauth2Client);
      console.log("Authorization successful");
    }
  });
}

function getNewToken(callback) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url: ", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        console.log("Error while trying to retrieve access token", err);
        return;
      }
      oauth2Client.setCredentials(token);
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== "EEXIST") {
      throw err;
    }
  }
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
  console.log("Token stored to " + TOKEN_PATH);
}

// Function to fetch comments 
async function fetchComments(auth, videoId) {
  const service = google.youtube("v3");
  try {
    const comments = [];

    let nextPageToken = null;
    do {
      const response = await service.commentThreads.list({
        auth: auth,
        part: "snippet",
        videoId: videoId,
        maxResults: 100,
        pageToken: nextPageToken,
      });

      response.data.items.forEach((item) => {
        comments.push(item.snippet.topLevelComment.snippet.textDisplay);
      });

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    return comments;
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
}

// Route to get comments
app.get("/comments", async (req, res) => {
  const videoId = req.query.videoId;
  try {
    authorize(async (auth) => {
      const comments = await fetchComments(auth, videoId);
      res.send(comments);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error retrieving comments");
  }
});

module.exports = app;
