// Import necessary modules
import { encryptData, decryptData } from "./encryption.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import request from "request";
import path from "path";

// Create an instance of the Express app
const app = express();

// Configure app settings
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.json());

// Define a route to render the index page
app.get("/", (req, res) => {
  res.render("index");
});

// Define filename and dirname using Node.js modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set the path for the keys.pem file
const keysFilePath = path.join(__dirname, "keys.pem");

// Route to add generated RSA keys
app.post("/addKeys", (req, res) => {
  // Check if keys.pem file already exists
  fs.access(keysFilePath, fs.constants.F_OK, (err) => {
    // File doesn't exist, so create it and store keys inside of it
    if (err) {
      const keys = req.body;

      // Encrypt the user's private key using AES-256
      keys.privateKey = encryptData(keys.privateKey);

      // Store keys inside keys.pem file
      fs.writeFile(keysFilePath, JSON.stringify(keys, null, 2), (err) => {
        if (err) throw err;
        console.log("Keys stored successfully");
      });
    } else {
      console.log("Keys already exist");
    }
  });
  res.status(201).send("Keys were successfully stored");
});

// Route to save sent emails
app.post("/saveLetters", (req, res) => {
  // Read the content inside "sent.json"
  const fileContents = fs.readFileSync("sent.json", "utf-8");

  // Parse the contents to a JavaScript object
  const messagesData = JSON.parse(fileContents);

  // Add the encrypted object to the "sent" array in the JavaScript object
  messagesData.unshift(req.body);

  // Convert the updated JavaScript object back to JSON string
  const updatedFileContents = JSON.stringify(messagesData, null, 2);

  // Write the updated JSON string back to the file
  fs.writeFileSync("sent.json", updatedFileContents);

  // Send a success response
  res.status(201).send("The email was sent");
});

// Route to add encrypted email
app.post("/addLetters", (req, res) => {
  // Read the content inside "outbox.json"
  const fileContents = fs.readFileSync("outbox.json", "utf-8");

  // Parse the contents to a JavaScript object
  const messagesData = JSON.parse(fileContents);

  // Add the encrypted object to the "outbox" array in the JavaScript object
  messagesData.unshift(req.body);

  // Convert the updated JavaScript object back to JSON string
  const updatedFileContents = JSON.stringify(messagesData, null, 2);

  // Write the updated JSON string back to the file
  fs.writeFileSync("outbox.json", updatedFileContents);

  // Send a success response
  res.status(201).send("The email was sent");
});

// Route to get database of a server in order to merge it with the current one
app.get("/mergeLetters", (req, res) => {
  //Read the contents of the JSON file
  const fileContents = fs.readFileSync("outbox.json", "utf-8");

  // Parse the contents to a JavaScript object
  const messagesData = JSON.parse(fileContents);

  // Send the "outbox" array from the JavaScript object as a JSON response
  res.json(messagesData);
});

// Route to get public key
app.get("/getPublicKey", (req, res) => {
  try {
    // Read the content inside "keys.pem"
    const fileContents = fs.readFileSync("keys.pem", "utf-8");

    // Parse the contents to a JavaScript object
    const keys = JSON.parse(fileContents);

    // Sends public key as a response
    const publicKey = keys.publicKey;
    res.send(publicKey);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to get decrypted private key
app.get("/getPrivateKey", (req, res) => {
  try {
    // Read the content inside "keys.pem"
    const fileContents = fs.readFileSync("keys.pem", "utf-8");

    // Parse the contents to a JavaScript object
    const keys = JSON.parse(fileContents);

    // Decrypt private key using AES-256
    const privateKeyPem = decryptData(keys.privateKey);

    // Send decrypted private key as a response
    res.send(privateKeyPem);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Define an array of peers and a URL
const port = "3000" // <-- Change port to the one you want to use
const peers = ["http://127.0.0.1:3001", "http://127.0.0.1:3000"]; // <-- Add peer here
var URL = "http://127.0.0.1:" + port;

// Function to get receiver's public key
const getReceiverPublicKey = (callback) => {
  // Create path to the current peer's "getPublicKey" route
  var currentPeer = peers[0] + "/getPublicKey";

  // Check if the current peer's "getPublicKey" route is the same as the server's URL
  if (currentPeer === URL + "/getPublicKey") {
    // If so, shift the peers array to rotate peers and return an error callback
    peers.push(peers.shift());
    callback(new Error("Receiver not found"), null);
    return;
  }

  // Make a request to the current peer's "getPublicKey" route
  request(currentPeer, (err, res, body) => {
    if (err) {
      // If an error occurs during the request, call the provided callback with the error
      callback(err, null);
    } else {
      // If the request is successful, retrieve the public key from the response body
      const publicKey = body;

      // Call the provided callback with no error and the retrieved receiver's public key
      callback(null, publicKey);
    }
  });
};

// Define a route to handle the retrieval of the receiver's public key
app.get("/getReceiverPublicKey", (req, res) => {
  // Call the "getReceiverPublicKey" function with a callback to handle the result
  getReceiverPublicKey((err, receiverPublicKey) => {
    if (err) {
      // If an error occurs during the retrieval, log an error message and send a 500 status response
      console.log("Could not get public key:", err);
      res.status(500).send("Internal Server Error");
    } else {
      try {
        // If successful, send the retrieved receiver's public key as the response
        res.send(receiverPublicKey);
      } catch (error) {
        // If an error occurs while sending the response, log an error message and send a 500 status response
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    }
  });
});

// Route to get saved sent emails
app.get("/getSavedLetters", (req, res) => {
  try {
    // Read the saved sent emails from the file
    const fileContents = fs.readFileSync("sent.json", "utf-8");

    // Parse the contents to a JavaScript object
    const messagesData = JSON.parse(fileContents);

    // Send the saved sent emails as a JSON response
    res.json(messagesData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Route to get emails from inbox
app.get("/getLetters", (req, res) => {
  try {
    // Read the encrypted data from the file
    const fileContents = fs.readFileSync("inbox.json", "utf-8");

    // Parse the contents to a JavaScript object
    const messagesData = JSON.parse(fileContents);

    // Send the data as a JSON response
    res.json(messagesData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Function to refresh the inbox by merging emails from peers
var refreshInbox = () => {
  // Create path to the current peer's "mergeLetters" route
  var currentPeer = peers[0] + "/mergeLetters";

  // Check if the current peer's "mergeLetters" route is the same as the server's URL
  if (currentPeer == URL + "/mergeLetters") {
    // If so, shift the peers array to rotate peers and return
    peers.push(peers.shift());
    return;
  }

  // Read and parse the contents of "inbox.json" file
  let myInbox = JSON.parse(fs.readFileSync("inbox.json", "utf-8"));

  // Make a request to the current peer's "mergeLetters" route
  request(currentPeer, (err, res, body) => {
    if (err) {
      // If an error occurs during the request, log the error
      return console.log(err);
    }

    // Parse the response body to get sender's outbox messages
    const senderOutbox = JSON.parse(body);

    // Update the local inbox array with emails from the sender's outbox
    senderOutbox.forEach((item) => {
      // Check if the item is not already in the local inbox
      const existingItemIndex = myInbox.findIndex((existingItem) => {
        return (
          existingItem.contact === item.contact &&
          existingItem.title === item.title &&
          existingItem.message === item.message
        );
      });

      if (existingItemIndex === -1) {
        // If the item is not already in the local inbox, push it to the array
        myInbox.unshift(item);
      }
    });

    // Update the local "inbox.json" file with the merged array
    fs.writeFileSync("inbox.json", JSON.stringify(myInbox, null, 2));
  });
};

// Start the Express app on the specified port
app.listen(port, () => {
  console.log("The server is running on port " + port);

  // Schedule the inbox refresh
  setInterval(refreshInbox, 5000);
});
