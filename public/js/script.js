// Initializing global variables
const forge = window.forge;
let sendKeysExecuted = false;
var optionValue = "Inbox";

Drop_menu(); //S'assurer que la liste soit dans le bon mode au lancement de la page
//Fonction qui permet la search de nom ou d'address

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
// Fonction qui affiche le form d'un nouveau message
function NewMail() {
  deleteMail();

  document.getElementById("form").style.display = "block";

  // Create "Send" button
  var sendButton = document.createElement("button");
  sendButton.style.marginLeft = "5px";
  sendButton.style.height = "27px";
  sendButton.textContent = "Send ➡️";
  sendButton.onclick = addMail;

  // Create "Cancel" button
  var cancelButton = document.createElement("button");
  cancelButton.style.height = "27px";
  cancelButton.style.marginTop = "8px";
  cancelButton.textContent = "Cancel ❌";
  cancelButton.onclick = deleteMail;

  // Add buttons to the form
  var form = document.getElementById("form");
  form.appendChild(sendButton);
  form.appendChild(cancelButton);
}

// Fonction qui ajoute un courriel à la liste d'envois lorsque "Envoyer" est appuyé
function addMail() {
  const titled = document.createElement("div");
  const titlename = document.createTextNode(
    document.getElementById("Title").value
  );
  const a = document.createElement("a");
  const br = document.createElement("br");
  const p = document.createElement("p");
  const useremail = document.createTextNode(
    document.getElementById("Address").value
  );
  const content = document.createTextNode(
    document.getElementById("Content").value
  );
  titled.appendChild(a);
  a.appendChild(useremail);
  a.appendChild(br);
  a.appendChild(titlename);
  titled.appendChild(p);
  p.appendChild(content);
  document.getElementById("Sent").appendChild(titled);
  titled.setAttribute("class", "Card");
  titled.setAttribute("onclick", "emailForm(this.id)");
  let time = new Date().getTime();
  titled.setAttribute("id", time);
  p.setAttribute("style", "display:none;");

  const contact = document.getElementById("Address").value;
  const title = document.getElementById("Title").value;
  const message = document.getElementById("Content").value;

  const email = {
    contact: contact,
    title: title,
    message: message,
  };

  sendMessage(email);

  document.getElementById("Title").value = "";
  document.getElementById("Address").value = "";
  document.getElementById("Content").value = "";
  document.getElementById("form").style.display = "none";
}

// Fonction qui efface le courriel en cours lorsque "Abandonner" est appuyé
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

// Fonction qui affiche le content du courriel
function emailForm(clickedId) {
  document.getElementById("form").style.display = "block";
  document.getElementById("Title").value = document
    .getElementById(clickedId)
    .getElementsByTagName("a")[0].childNodes[2].textContent;
  document.getElementById("Address").value = document
    .getElementById(clickedId)
    .getElementsByTagName("a")[0].childNodes[0].textContent;
  document.getElementById("Content").value = document
    .getElementById(clickedId)
    .getElementsByTagName("p")[0].innerText;
}

function messageReceived(contact, title, message) {
  document.getElementById("form").style.display = "block";
  document.getElementById("Title").value = title;
  document.getElementById("Address").value = contact;
  document.getElementById("Content").value = message;
}

//Fonction du drop menu qui affiche la boite de reception, le carnet d'address ou
function Drop_menu() {
  var optionValue = document.getElementById("Option_menu").value; //valeur selectioné dans le drop menu

  //Affichage Boite de reception
  if (optionValue == "Inbox") {
    document.getElementById("Sent").style.display = "none";
    document.getElementById("Received").style.display = "block";

    getMessages();
    return optionValue;
  }

  //Affichage emails sent
  if (optionValue == "Emails sent") {
    document.getElementById("Sent").style.display = "block";
    document.getElementById("Received").style.display = "none";

    return optionValue;
  }
}

//////////////////////////////////////////////////////////////////////////////
// Fetch and get requests

// Generate RSA key pair for encryption and decryption

async function sendKeys() {
  try {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 1024 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);

    const keys = {
      privateKey: privateKeyPem,
      publicKey: publicKeyPem,
    };

    const response = await fetch("/addKeys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(keys, null, 2),
    });

    if (response.ok) {
      console.log("Keys were sent.");
      sendKeysExecuted = true;
    } else {
      console.error("Could not send keys:", response.statusText);
    }
  } catch (error) {
    console.error("Could not send keys:", error);
  }
}

var receiverPublicKey = null;
var privateKey = null;

async function getReceiverPublicKey() {
  try {
    const response = await fetch("/getReceiverPublicKey", {
      method: "GET",
      headers: {
        "Content-Type": "application/text",
      },
    });
    if (response.ok) {
      const receiverPublicKeyPem = await response.text();

      // Convert PEM keys to Forge objects
      receiverPublicKey = forge.pki.publicKeyFromPem(receiverPublicKeyPem);
    } else {
      console.error("Could not get private key:", response.statusText);
    }
  } catch (error) {
    console.error("Could not get private key:", error);
  }
}

async function sendMessage(email) {
  try {
    // Wait until receiverPublicKey is fetched before proceeding
    await getReceiverPublicKey();

    const encryptedData = encryption(receiverPublicKey, email);

    // Check if receiverPublicKey is available before sending the message
    if (receiverPublicKey == null || receiverPublicKey == undefined) {
      console.error("Receiver public key not available");
      return;
    }

    // Send a POST request to the server with the message text as JSON string in the request body
    const response = await fetch("/addLetters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(encryptedData, null, 2), // Convert the message object to JSON string and include it as the request body
    });

    // Check the response status
    if (response.ok) {
      // Request was successful
      console.log("The email was successfully sent");
    } else {
      // Request failed
      console.error("Unable to send email:", response.statusText);
    }
  } catch (error) {
    console.error("Unable to send email:", error);
  }
}

async function getPrivateKey() {
  try {
    if (!sendKeysExecuted) {
      await sendKeys();
    }

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

async function getMessages() {
  // Wait until receiverPublicKey is fetched before proceeding
  await getPrivateKey();

  // Check if privateKey is available before decrypting the messages
  if (privateKey == null || privateKey == undefined) {
    console.error("Private key not available");
    return;
  }

  // getMessages est appelé dans Drop_menu()
  try {
    // Send a GET request to the server to retrieve the JSON array
    const response = await fetch("/getLetters", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      // Response received successfully
      const messagesData = await response.json(); // Parse the response as JSON

      // Access the "Inbox" array from the JSON data
      const inboxArray = decryption(privateKey, messagesData);

      // Access the element in the DOM where you want to display the JSON data
      const outputElement = document.getElementById("Received");

      // Clear any existing content in the outputElement
      outputElement.innerHTML = "";

      // Loop through the array and create HTML elements to display the data
      inboxArray.forEach((item) => {
        // Create container div for each message
        if (item.contact && item.title && item.message != undefined) {
          const messageContainer = document.createElement("div");
          messageContainer.setAttribute("class", "Card");
          messageContainer.setAttribute(
            "onclick",
            `messageReceived('${item.contact}', '${item.title}', '${item.message}')`
          );

          // Create contact element
          const a = document.createElement("a");
          const br = document.createElement("br");
          const p = document.createElement("p");

          const contact = document.createTextNode(item.contact);
          const title = document.createTextNode(item.title);
          const message = document.createTextNode(item.message);

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
      // Request failed
      console.error("Could not receive emails:", response.statusText);
    }
  } catch (error) {
    console.error("Could not receive emails:", error);
  }
}

const encryption = (receiverPublicKey, email) => {
  // Create variables that contain the properties that need to be encrypted
  const contact = email.contact;
  const title = email.title;
  const message = email.message;

  // Convert input data to binary using UTF-8 encoding
  const contactBytes = forge.util.encodeUtf8(contact);
  const titleBytes = forge.util.encodeUtf8(title);
  const messageBytes = forge.util.encodeUtf8(message);

  // Encrypt the message properties using the RSA public key
  const encryptedContact = receiverPublicKey.encrypt(contactBytes, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });
  const encryptedTitle = receiverPublicKey.encrypt(titleBytes, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });
  const encryptedMessage = receiverPublicKey.encrypt(messageBytes, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });

  // Convert the encrypted binary data to Base64 strings
  const encryptedContactBase64 = forge.util.encode64(encryptedContact);
  const encryptedTitleBase64 = forge.util.encode64(encryptedTitle);
  const encryptedMessageBase64 = forge.util.encode64(encryptedMessage);

  // Create a new object with encrypted properties
  const encryptedData = {
    contact: encryptedContactBase64,
    title: encryptedTitleBase64,
    message: encryptedMessageBase64,
  };

  return encryptedData;
};

const decryption = (privateKey, messagesData) => {
  const decryptedData = messagesData.map((encryptedData) => {
    // Convert Base64 strings back to binary data
    const decodedContactBytes = forge.util.decode64(encryptedData.contact);
    const decodedTitleBytes = forge.util.decode64(encryptedData.title);
    const decodedMessageBytes = forge.util.decode64(encryptedData.message);

    const decryptedContact = privateKey.decrypt(
      decodedContactBytes,
      "RSA-OAEP",
      {
        md: forge.md.sha256.create(),
      }
    );
    const decryptedTitle = privateKey.decrypt(decodedTitleBytes, "RSA-OAEP", {
      md: forge.md.sha256.create(),
    });
    const decryptedMessage = privateKey.decrypt(
      decodedMessageBytes,
      "RSA-OAEP",
      {
        md: forge.md.sha256.create(),
      }
    );

    return {
      contact: decryptedContact,
      title: decryptedTitle,
      message: decryptedMessage,
    };
  });

  return decryptedData;
};
