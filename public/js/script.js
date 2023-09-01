// Initialize global variables
const forge = window.forge;
var sendKeysExecuted = false;
var optionValue = "Inbox";

// Ensure the drop-down menu is set correctly on page load
Drop_menu();

// Function for searching emails by name or address
function search() {
  let a, str, div;
  let Input = document.getElementById("search");
  let Filter = Input.value.toUpperCase();
  let Sent = document.getElementById("Sent");
  let Received = document.getElementById("Received");
  if (optionValue == "Emails sent") {
    div = Sent.getElementsByTagName("div");
  }
  if (optionValue == "Inbox") {
    div = Received.getElementsByTagName("div");
  }

  // Loop through the elements and update display style based on filter
  for (let i = 0; i < div.length; i++) {
    a = div[i].getElementsByTagName("a")[0];
    str = a.textContent || a.innerText;
    if (str.toUpperCase().indexOf(Filter) > -1) {
      div[i].style.display = "";
    } else {
      div[i].style.display = "none";
    }
  }
}

// Function to display the form for composing a new email
function NewMail() {
  deleteMail();

  const addressInput = document.getElementById("Address");
  const titleInput = document.getElementById("Title");
  const contentTextarea = document.getElementById("Content");

  // Turns off read only mode so the user can write emails
  addressInput.readOnly = false;
  titleInput.readOnly = false;
  contentTextarea.readOnly = false;

  // Display email form
  document.getElementById("form").style.display = "block";

  // Create "Send" button
  var sendButton = document.createElement("button");
  sendButton.style.marginLeft = "5px";
  sendButton.style.height = "27px";
  sendButton.style.cursor = "pointer";
  sendButton.textContent = "Send ➡️";
  sendButton.onclick = addMail;

  // Create "Cancel" button
  var cancelButton = document.createElement("button");
  cancelButton.style.height = "27px";
  cancelButton.style.marginTop = "8px";
  cancelButton.style.cursor = "pointer";
  cancelButton.textContent = "Cancel ❌";
  cancelButton.onclick = deleteMail;

  // Add buttons to the form
  var form = document.getElementById("form");
  form.appendChild(sendButton);
  form.appendChild(cancelButton);
}

// Function to add an email to the sent email list and to the outbox list upon pressing "Send"
function addMail() {
  const contact = document.getElementById("Address").value;
  const title = document.getElementById("Title").value;
  const message = document.getElementById("Content").value;

  const email = {
    contact: contact,
    title: title,
    message: message,
  };

  saveMessage(email);
  sendMessage(email);

  document.getElementById("Title").value = "";
  document.getElementById("Address").value = "";
  document.getElementById("Content").value = "";
  document.getElementById("form").style.display = "none";
}

// Function to display the contents of received emails and sent emails
function displayMessages(contactBase64, titleBase64, messageBase64) {
  deleteMail();

  const formElement = document.getElementById("form");
  const addressInput = document.getElementById("Address");
  const titleInput = document.getElementById("Title");
  const contentTextarea = document.getElementById("Content");

  // Turns on read only mode to stop the user from modifying the contents of the displayed emails
  addressInput.readOnly = true;
  titleInput.readOnly = true;
  contentTextarea.readOnly = true;

  // Converts base64 back to utf8  
  const contact = forge.util.decode64(contactBase64);
  const title = forge.util.decode64(titleBase64);
  const message = forge.util.decode64(messageBase64);

  // Displays data
  document.getElementById("Address").value = contact;
  document.getElementById("Title").value = title;
  document.getElementById("Content").value = message;

  formElement.style.display = "block";
}

// Function to clear the current email form
function deleteMail() {
  document.getElementById("Title").value = "";
  document.getElementById("Address").value = "";
  document.getElementById("Content").value = "";

  var form = document.getElementById("form");
  var existingButtons = form.querySelectorAll("button");

  existingButtons.forEach((button) => {
    button.remove();
  });

  document.getElementById("form").style.display = "none";
}

// Function for the drop-down menu to display either Inbox or Sent items
function Drop_menu() {
  var optionValue = document.getElementById("Option_menu").value;

  // Display Inbox
  if (optionValue == "Inbox") {
    document.getElementById("Sent").style.display = "none";
    document.getElementById("Received").style.display = "block";

    getMessages();

    return optionValue;
  }

  // Display Sent items
  if (optionValue == "Emails sent") {
    document.getElementById("Sent").style.display = "block";
    document.getElementById("Received").style.display = "none";

    getSavedMessages();

    return optionValue;
  }
}

// Generate RSA key pair for encryption and decryption
async function sendKeys() {
  try {
    // Generate RSA key pair with the length of 2048 bits
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);

    // Store private and public keys inside a Javascript object
    const keys = {
      privateKey: privateKeyPem,
      publicKey: publicKeyPem,
    };

    // Send a POST request to the server with the generated key pair as JSON string in the request body
    const response = await fetch("/addKeys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(keys, null, 2),
    });

    if (response.ok) {
      console.log("Keys were sent.");

      // Changes boolean flag to true so as not to send a generated key pair each time the method is called
      sendKeysExecuted = true;
    } else {
      console.error("Could not send keys:", response.statusText);
    }
  } catch (error) {
    console.error("Could not send keys:", error);
  }
}

// Initialize key pair for encryption and decryption
var receiverPublicKey = null;
var privateKey = null;

// Fetch the receiver's public key
async function getReceiverPublicKey() {
  try {
    // Send a GET request to the server to retrieve the receiver's public key
    const response = await fetch("/getReceiverPublicKey", {
      method: "GET",
      headers: {
        "Content-Type": "application/text",
      },
    });
    if (response.ok) {
      const receiverPublicKeyPem = await response.text();

      // Convert PEM key to Forge object
      receiverPublicKey = forge.pki.publicKeyFromPem(receiverPublicKeyPem);
    } else {
      console.error("Could not get receiver's public key:", response.statusText);
    }
  } catch (error) {
    console.error("Could not get receiver's public key:", error);
  }
}

// Save sent email in the server's database
async function saveMessage(email) {
  try {
    // Send a POST request to the server with the sent email as JSON string in the request body
    const response = await fetch("/saveLetters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(email, null, 2),
    });

    if (response.ok) {
      console.log("The email was successfully saved");
    } else {
      console.error("Unable to save email:", response.statusText);
    }
  } catch (error) {
    console.error("Unable to save email:", error);
  }
}

// Encrypt and send an email to the server
async function sendMessage(email) {
  try {
    // Wait until receiverPublicKey is fetched before proceeding
    await getReceiverPublicKey();

    // Check if receiverPublicKey is available before encrypting the email
    if (receiverPublicKey == null || receiverPublicKey == undefined) {
      console.error("Receiver public key not available");
      return;
    }

    // Encrypt email using the receiver's public key
    const encryptedData = encryption(receiverPublicKey, email);

    // Send a POST request to the server with the encrypted email as JSON string in the request body
    const response = await fetch("/addLetters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(encryptedData, null, 2),
    });

    if (response.ok) {
      console.log("The email was successfully sent");
    } else {
      console.error("Unable to send email:", response.statusText);
    }
  } catch (error) {
    console.error("Unable to send email:", error);
  }
}

// Fetch the user's private key
async function getPrivateKey() {
  try {
    // Check if a generated RSA key pair has already been sent to the server
    if (!sendKeysExecuted) {
      // Wait until a generated RSA key pair is sent to the server
      await sendKeys();
    }

    // Send a GET request to the server to retrieve the user's private key
    const response = await fetch("/getPrivateKey", {
      method: "GET",
      headers: {
        "Content-Type": "application/text",
      },
    });
    if (response.ok) {
      const privateKeyPem = await response.text();

      // Convert PEM string to Forge private key object
      privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    } else {
      console.error("Could not get private key:", response.statusText);
    }
  } catch (error) {
    console.error("Could not get private key:", error);
  }
}

// Fetch saved sent emails from the server's database
async function getSavedMessages() {
  try {
    // Send a GET request to the server to retrieve the saved sent emails JSON array
    const response = await fetch("/getSavedLetters", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      // Parse the response as JSON
      const messagesData = await response.json();

      // Access the element in the DOM where the sent emails will be displayed
      const outputElement = document.getElementById("Sent");

      // Clear any existing content in the outputElement
      outputElement.innerHTML = "";

      // Loop through the array and create HTML elements to display the sent emails
      messagesData.forEach((item) => {
        // Create container div for each sent email if the emails aren't undefined
        if (item.contact && item.title && item.message != undefined) {
          // Convert to base64 to prevent syntax errors
          const contactBase64 = forge.util.encode64(item.contact);
          const titleBase64 = forge.util.encode64(item.title);
          const messageBase64 = forge.util.encode64(item.message);

          // Create message container
          const messageContainer = document.createElement("div");
          messageContainer.setAttribute("class", "Card");
          messageContainer.setAttribute(
            "onclick",
            `displayMessages('${contactBase64}', '${titleBase64}', '${messageBase64}')`
          );

          // Create elements for structure
          const div = document.createElement("div");
          const br = document.createElement("br");

          // Create text nodes for each element of the email
          const contact = document.createTextNode(item.contact);
          const title = document.createTextNode(item.title);

          // Append created elements to create a message container
          messageContainer.appendChild(div);
          div.appendChild(contact);
          div.appendChild(br);
          div.appendChild(title);

          // Append the message container to the outputElement
          outputElement.appendChild(messageContainer);
        }
      });
    } else {
      console.error("Could not get saved emails:", response.statusText);
    }
  } catch (error) {
    console.error("Could not get saved emails:", error);
  }
}

// Fetch and decrypt emails from the server
async function getMessages() {
  // Wait until the user's private key is fetched before proceeding
  await getPrivateKey();

  // Check if privateKey is available before decrypting the messages
  if (privateKey == null || privateKey == undefined) {
    console.error("Private key not available");
    return;
  }

  try {
    // Send a GET request to the server to retrieve the received emails JSON array
    const response = await fetch("/getLetters", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      // Parse the response as JSON
      const messagesData = await response.json();

      // Decrypt received emails JSON array
      const inboxArray = decryption(privateKey, messagesData);

      // Access the element in the DOM where the received emails will be displayed
      const outputElement = document.getElementById("Received");

      // Clear any existing content in the outputElement
      outputElement.innerHTML = "";

      // Loop through the array and create HTML elements to display the received emails
      inboxArray.forEach((item) => {
        // Check if contact, title and message properties are all available before displaying messages
        if (item.contact && item.title && item.message != undefined) {
          // Convert to base64 to prevent syntax errors
          const contactBase64 = forge.util.encode64(item.contact);
          const titleBase64 = forge.util.encode64(item.title);
          const messageBase64 = forge.util.encode64(item.message);

          // Create message container
          const messageContainer = document.createElement("div");
          messageContainer.setAttribute("class", "Card");
          messageContainer.setAttribute(
            "onclick",
            `displayMessages('${contactBase64}', '${titleBase64}', '${messageBase64}')`
          );

          // Create elements for structure
          const div = document.createElement("div");
          const br = document.createElement("br");

          // Create text nodes for each element of the email
          const contact = document.createTextNode(item.contact);
          const title = document.createTextNode(item.title);

          // Append created elements to create a message container
          messageContainer.appendChild(div);
          div.appendChild(contact);
          div.appendChild(br);
          div.appendChild(title);

          // Append the message container to the outputElement
          outputElement.appendChild(messageContainer);
        }
      });
    } else {
      console.error("Could not receive emails:", response.statusText);
    }
  } catch (error) {
    console.error("Could not receive emails:", error);
  }
}

// Function for encryption using receiver's public key
const encryption = (receiverPublicKey, email) => {
  // Create variables that contain the properties that need to be encrypted
  const contact = email.contact;
  const title = email.title;
  const message = email.message;

  // Encrypt the email properties using AES-256
  const encryptedData = aesEncryption(contact, title, message);

  // Encrypt the generated aesKey and encryptionIV using the receiver's public key
  const encryptedAesKey = receiverPublicKey.encrypt(encryptedData.aesKey, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });

  const encryptedIV = receiverPublicKey.encrypt(encryptedData.encryptionIV, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });

  // Convert to base64 to prevent data corruption
  encryptedData.aesKey = forge.util.encode64(encryptedAesKey);
  encryptedData.encryptionIV = forge.util.encode64(encryptedIV);

  // Return encrypted email object
  return encryptedData;
};

function aesEncryption(contact, title, message) {
  // Generate a random 256-bit encryption key
  const aesKey = forge.random.getBytesSync(32);

  // Create a random initialization vector (IV)
  const iv = forge.random.getBytesSync(16);
  
  // Convert the input data to Forge buffers
  const contactBuffer = forge.util.createBuffer(contact, 'utf8');
  const titleBuffer = forge.util.createBuffer(title, 'utf8');
  const messageBuffer = forge.util.createBuffer(message, 'utf8');

  // Create the AES cipher with the key and IV
  const cipher = forge.cipher.createCipher('AES-CBC', aesKey);

  // Encrypt data
  cipher.start({ iv: iv });
  cipher.update(contactBuffer);
  cipher.finish();

  // Get the encrypted data as bytes and convert it to base64
  const encryptedContact = cipher.output.bytes();
  const encryptedContactBase64 = forge.util.encode64(encryptedContact);

  cipher.start({ iv: iv });
  cipher.update(titleBuffer);
  cipher.finish();

  const encryptedTitle = cipher.output.bytes();
  const encryptedTitleBase64 = forge.util.encode64(encryptedTitle);

  cipher.start({ iv: iv });
  cipher.update(messageBuffer);
  cipher.finish();

  const encryptedMessage = cipher.output.bytes();
  const encryptedMessageBase64 = forge.util.encode64(encryptedMessage);

  // Return encrypted properties along with AES Key and encryption IV used
  return {
    contact: encryptedContactBase64,
    title: encryptedTitleBase64,
    message: encryptedMessageBase64,
    aesKey: aesKey,
    encryptionIV: iv,
  };
}

// Function for decryption using the user's private key
const decryption = (privateKey, messagesData) => {
  // Loop through the array and decrypt each encrypted property of each email object
  const decryptedData = messagesData.map((encryptedData) => {
    // Decode AES key and encryption IV from base 64
    const encryptedAeskey = forge.util.decode64(encryptedData.aesKey);
    const encryptedEncryptionIV = forge.util.decode64(encryptedData.encryptionIV);
  
    // Decrypt the AES key and encryptionIV using the user's private key
    encryptedData.aesKey = privateKey.decrypt(encryptedAeskey, "RSA-OAEP", {
      md: forge.md.sha256.create(),
    });

    encryptedData.encryptionIV = privateKey.decrypt(encryptedEncryptionIV, "RSA-OAEP", {
      md: forge.md.sha256.create(),
    });

    // Decrypt the email properties using the user's private key
    const decryptedEmail = aesDecryption(encryptedData);

    // Return decrypted email object
    return decryptedEmail;
  });

  // Return decrypted received emails JSON array
  return decryptedData;
};

// Decrypt data using AES-256
function aesDecryption(encryptedData) {
  // Convert received encrypted properties in base64 back into bytes
  const encryptedContactBytes = forge.util.decode64(encryptedData.contact);
  const encryptedTitleBytes = forge.util.decode64(encryptedData.title);
  const encryptedMessageBytes = forge.util.decode64(encryptedData.message);

  // Create buffers to hold data to decrypt 
  const encryptedContact = forge.util.createBuffer(encryptedContactBytes, 'raw');
  const encryptedTitle = forge.util.createBuffer(encryptedTitleBytes, 'raw');
  const encryptedMessage = forge.util.createBuffer(encryptedMessageBytes, 'raw');

  // Retrieves AES key and encryption IV used for AES encryption
  const aesKey = encryptedData.aesKey;
  const encryptionIV = encryptedData.encryptionIV

  // Create the AES decipher with the key and IV
  const decipher = forge.cipher.createDecipher('AES-CBC', aesKey);

  // Decrypt data and convert it back to utf8
  decipher.start({ iv: encryptionIV });
  decipher.update(encryptedContact);
  decipher.finish();

  const decryptedContactBytes = decipher.output.getBytes();
  const decryptedContact = decryptedContactBytes.toString('utf8');

  decipher.start({ iv: encryptionIV });
  decipher.update(encryptedTitle);
  decipher.finish();

  const decryptedTitleBytes = decipher.output.getBytes();
  const decryptedTitle = decryptedTitleBytes.toString('utf8');

  decipher.start({ iv: encryptionIV });
  decipher.update(encryptedMessage);
  decipher.finish();

  const decryptedMessageBytes = decipher.output.getBytes();
  const decryptedMessage = decryptedMessageBytes.toString('utf8')

  return {
    contact: decryptedContact,
    title: decryptedTitle,
    message: decryptedMessage,
  };
}