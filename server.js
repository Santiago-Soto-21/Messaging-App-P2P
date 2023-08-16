import { encryptData, decryptData } from "./encryption.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import request from "request";
import path from "path";

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.render("Courriel");
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const keysFilePath = path.join(__dirname, "keys.pem");

app.post("/addKeys", (req, res) => {
  fs.access(keysFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File doesn't exist, so create it and add the JSON object
      const keys = req.body;

      keys.privateKey = encryptData(keys.privateKey);

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

app.post("/addLetters", (req, res) => {
  //console.log(req);
  console.log(req.body);

  // Read the content inside "Tableau1.json"
  const fileContents = fs.readFileSync("outbox.json", "utf-8");

  // Parse the contents to a JavaScript object
  const messagesData = JSON.parse(fileContents);

  // Add the encrypted object to the "Tableau" array in the JavaScript object
  messagesData.unshift(req.body);

  // Convert the updated JavaScript object back to JSON string
  const updatedFileContents = JSON.stringify(messagesData, null, 2);

  // Write the updated JSON string back to the file
  fs.writeFileSync("outbox.json", updatedFileContents);

  // Send a success response
  res.status(201).send("Le message a été envoyé");
});

app.get("/mergeLetters", (req, res) => {
  //Read the contents of the JSON file
  const fileContents = fs.readFileSync('outbox.json', 'utf-8');

  // Parse the contents to a JavaScript object
  const messagesData = JSON.parse(fileContents);

  // Send the "Tableau" array from the JavaScript object as a JSON response
  res.json(messagesData);
})

app.get("/getPublicKey", (req, res) => {
  try {
    const fileContents = fs.readFileSync("keys.pem", "utf-8");
    const keys = JSON.parse(fileContents);

    const publicKey = keys.publicKey;

    res.send(publicKey);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/getPrivateKey", (req, res) => {
  try {
    const fileContents = fs.readFileSync("keys.pem", "utf-8");
    const keys = JSON.parse(fileContents);

    const privateKeyPem = decryptData(keys.privateKey);

    res.send(privateKeyPem);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

const paires = ["http://127.0.0.1:3001", "http://127.0.0.1:3000"];
var URL = "http://127.0.0.1:3000";

const getReceiverPublicKey = (callback) => {
  var paireActuel = paires[0] + "/getPublicKey";

  if (paireActuel === URL + "/getPublicKey") {
    paires.push(paires.shift());
    callback(new Error("Receiver not found"), null);
    return;
  }

  request(paireActuel, (err, res, body) => {
    if (err) {
      callback(err, null);
    } else {
      const publicKey = body;
      callback(null, publicKey);
    }
  });
};

app.get("/getReceiverPublicKey", (req, res) => {
  getReceiverPublicKey((err, receiverPublicKey) => {
    if (err) {
      console.log("Could not get public key:", err);
      res.status(500).send("Internal Server Error");
    } else {
      try {
        res.send(receiverPublicKey);
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    }
  });
});

app.get("/getLetters", (req, res) => {
  try {
    // Read the encrypted data from the file
    const fileContents = fs.readFileSync("inbox.json", "utf-8");

    // Parse the contents to a JavaScript object
    const messagesData = JSON.parse(fileContents);

    // Send the data as a JSON response
    res.json(messagesData);
    console.log(messagesData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

var refreshInbox = () => {
  var paireActuel = paires[0] + "/mergeLetters";
  if (paireActuel == URL + "/mergeLetters") {
    paires.push(paires.shift());
    return;
  }

  let myInbox = JSON.parse(fs.readFileSync("inbox.json", "utf-8"));

  request(paireActuel, (err, res, body) => {
    if (err) {
      return console.log(err);
    }

    console.log(body);
    const senderOutbox = JSON.parse(body);

    // Update the array in "Tableau.json" with elements from "tableau2"
    senderOutbox.forEach((item) => {
      // Check if the item is not already in "tableau1"
      const existingItemIndex = myInbox.findIndex((existingItem) => {
        return (
          existingItem.contact.cipher === item.contact.cipher &&
          existingItem.titre.cipher === item.titre.cipher &&
          existingItem.message.cipher === item.message.cipher
        );
      });

      if (existingItemIndex === -1) {
        // If the item is not already in "tableau1", push it to the array
        myInbox.unshift(item);
      }
    });

    // Update the local JSON file with the merged array
    fs.writeFileSync("inbox.json", JSON.stringify(myInbox, null, 2));

    console.log(
      "Local JSON file updated with merged array:",
      JSON.stringify(myInbox, null, 2)
    );
  });
};

app.listen(3000, () => {
  console.log("Le serveur est dans le port 3000");
  setInterval(refreshInbox, 15000);
});
