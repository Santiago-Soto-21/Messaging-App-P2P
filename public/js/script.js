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
function messageReceived(contact, title, message) {
  deleteMail();

  const formElement = document.getElementById("form");
  const addressInput = document.getElementById("Address");
  const titleInput = document.getElementById("Title");
  const contentTextarea = document.getElementById("Content");
  
  // Turns on read only mode to stop the user from modifying the contents of the displayed emails
  addressInput.readOnly = true;
  titleInput.readOnly = true;
  contentTextarea.readOnly = true;
 
  document.getElementById("Title").value = title;
  document.getElementById("Address").value = contact;
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

  existingButtons.forEach(button => {
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
      console.error("Could not get private key:", response.statusText);
    }
  } catch (error) {
    console.error("Could not get private key:", error);
  }
}

// Save sent email in the server's database
async function saveMessage(email){
  try{
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
    } else{
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
async function getSavedMessages(){
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
          const messageContainer = document.createElement("div");
          messageContainer.setAttribute("class", "Card");
          messageContainer.setAttribute(
            "onclick",
            `messageReceived('${item.contact}', '${item.title}', '${item.message}')`
          );

          // Create elements for structure
          const a = document.createElement("a");
          const br = document.createElement("br");
          const p = document.createElement("p");

          // Create text nodes for each element of the email
          const contact = document.createTextNode(item.contact);
          const title = document.createTextNode(item.title);
          const message = document.createTextNode(item.message);

          // Append created elements to create a message container
          messageContainer.appendChild(a);
          a.appendChild(contact);
          a.appendChild(br);
          a.appendChild(title);
          messageContainer.appendChild(p);
          p.appendChild(message);
          p.setAttribute("style", "display:none;");

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

  // getMessages est appelé dans Drop_menu()
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
        // Create container div for each email
        if (item.contact && item.title && item.message != undefined) {
          const messageContainer = document.createElement("div");
          messageContainer.setAttribute("class", "Card");
          messageContainer.setAttribute(
            "onclick",
            `messageReceived('${item.contact}', '${item.title}', '${item.message}')`
          );

          // Create elements for structure
          const a = document.createElement("a");
          const br = document.createElement("br");
          const p = document.createElement("p");

          // Create text nodes for each element of the email
          const contact = document.createTextNode(item.contact);
          const title = document.createTextNode(item.title);
          const message = document.createTextNode(item.message);

          // Append created elements to create a message container
          messageContainer.appendChild(a);
          a.appendChild(contact);
          a.appendChild(br);
          a.appendChild(title);
          messageContainer.appendChild(p);
          p.appendChild(message);
          p.setAttribute("style", "display:none;");

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

  // Convert input data to binary using UTF-8 encoding
  const contactBytes = forge.util.encodeUtf8(contact);
  const titleBytes = forge.util.encodeUtf8(title);
  const messageBytes = forge.util.encodeUtf8(message);

  // Encrypt the email properties using the receiver's public key
  const encryptedContact = receiverPublicKey.encrypt(contactBytes, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });
  const encryptedTitle = receiverPublicKey.encrypt(titleBytes, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });
  const encryptedMessage = receiverPublicKey.encrypt(messageBytes, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });

  // Convert the encrypted binary data to Base64 strings to prevent data from corrupting
  const encryptedContactBase64 = forge.util.encode64(encryptedContact);
  const encryptedTitleBase64 = forge.util.encode64(encryptedTitle);
  const encryptedMessageBase64 = forge.util.encode64(encryptedMessage);

  // Create a new object with encrypted properties
  const encryptedData = {
    contact: encryptedContactBase64,
    title: encryptedTitleBase64,
    message: encryptedMessageBase64,
  };

  // Return encrypted email object
  return encryptedData;
};

// Function for decryption using the user's private key
const decryption = (privateKey, messagesData) => {
  // Loop through the array and decrypt each encrypted property of each email object
  const decryptedData = messagesData.map((encryptedData) => {
    // Convert Base64 strings back to binary data
    const decodedContactBytes = forge.util.decode64(encryptedData.contact);
    const decodedTitleBytes = forge.util.decode64(encryptedData.title);
    const decodedMessageBytes = forge.util.decode64(encryptedData.message);

    // Decrypt the email properties using the user's private key
    const decryptedContact = privateKey.decrypt(decodedContactBytes, "RSA-OAEP", {
        md: forge.md.sha256.create(),
      });
    const decryptedTitle = privateKey.decrypt(decodedTitleBytes, "RSA-OAEP", {
      md: forge.md.sha256.create(),
    });
    const decryptedMessage = privateKey.decrypt(decodedMessageBytes, "RSA-OAEP", {
        md: forge.md.sha256.create(),
    });

    // Return decrypted email object
    return {
      contact: decryptedContact,
      title: decryptedTitle,
      message: decryptedMessage,
    };
  });

  // Return decrypted received emails JSON array
  return decryptedData;
};
