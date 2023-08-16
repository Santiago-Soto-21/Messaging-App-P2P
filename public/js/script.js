// Ouvrir les fichiers suivants: Server1, Server2, Tableau1, Tableau2, Testgenerator et TestEncrypt.
const forge = window.forge;
let sendKeysExecuted = false;

//Partie projet 1
var optionValue = "Boite de réception"; //valeur initial du drop menu

Drop_menu(); //S'assurer que la liste soit dans le bon mode au lancement de la page
//Fonction qui permet la recherche de nom ou d'adresse

function recherche() {
  let a, str, div;
  let Entree = document.getElementById("recherche");
  let Filtre = Entree.value.toUpperCase();
  let Envoyes = document.getElementById("Envoyes");
  let Recu = document.getElementById("Recu");
  if (optionValue == "Emails envoyés") {
    div = Envoyes.getElementsByTagName("div");
  }
  if (optionValue == "Boite de réception") {
    div = Recu.getElementsByTagName("div");
  }

  for (let i = 0; i < div.length; i++) {
    a = div[i].getElementsByTagName("a")[0];
    str = a.textContent || a.innerText;
    if (str.toUpperCase().indexOf(Filtre) > -1) {
      div[i].style.display = "";
    } else {
      div[i].style.display = "none";
    }
  }
}
// Fonction qui affiche le formulaire d'un nouveau message
function NewMail() {
  document.getElementById("formulaire").style.display = "block";
}

// Fonction qui ajoute un courriel à la liste d'envois lorsque "Envoyer" est appuyé
function addMail() {
  const title = document.createElement("div");
  const titlename = document.createTextNode(
    document.getElementById("Titre").value
  );
  const a = document.createElement("a");
  const br = document.createElement("br");
  const p = document.createElement("p");
  const useremail = document.createTextNode(
    document.getElementById("Adresse").value
  );
  const content = document.createTextNode(
    document.getElementById("Contenu").value
  );
  title.appendChild(a);
  a.appendChild(useremail);
  a.appendChild(br);
  a.appendChild(titlename);
  title.appendChild(p);
  p.appendChild(content);
  document.getElementById("Envoyes").appendChild(title);
  title.setAttribute("class", "Carte");
  title.setAttribute("onclick", "apercu_email(this.id)");
  let time = new Date().getTime();
  title.setAttribute("id", time);
  p.setAttribute("style", "display:none;");

  const contact = document.getElementById("Adresse").value;
  const titre = document.getElementById("Titre").value;
  const message = document.getElementById("Contenu").value;

  console.log(contact);

  const email = {
    contact: contact,
    titre: titre,
    message: message,
  }

  sendMessage(email);

  document.getElementById("Titre").value = "";
  document.getElementById("Adresse").value = "";
  document.getElementById("Contenu").value = "";
  document.getElementById("formulaire").style.display = "none";
}

// Fonction qui efface le courriel en cours lorsque "Abandonner" est appuyé
function deleteMail() {
  document.getElementById("Titre").value = "";
  document.getElementById("Adresse").value = "";
  document.getElementById("Contenu").value = "";
  document.getElementById("formulaire").style.display = "none";
}

// Fonction qui affiche le contenu du courriel
function apercu_email(clickedId) {
  document.getElementById("formulaire").style.display = "block";
  document.getElementById("Titre").value = document
    .getElementById(clickedId)
    .getElementsByTagName("a")[0].childNodes[2].textContent;
  document.getElementById("Adresse").value = document
    .getElementById(clickedId)
    .getElementsByTagName("a")[0].childNodes[0].textContent;
  document.getElementById("Contenu").value = document
    .getElementById(clickedId)
    .getElementsByTagName("p")[0].innerText;
}

function messageRecu(contact, titre, message) {
  document.getElementById("formulaire").style.display = "block";
  document.getElementById("Titre").value = titre;
  document.getElementById("Adresse").value = contact;
  document.getElementById("Contenu").value = message;
}

//Fonction du drop menu qui affiche la boite de reception, le carnet d'adresse ou
function Drop_menu() {
  var optionValue = document.getElementById("Option_menu").value; //valeur selectioné dans le drop menu

  //Affichage Boite de reception
  if (optionValue == "Boite de réception") {
    document.getElementById("Envoyes").style.display = "none";
    document.getElementById("Recu").style.display = "block";

    getMessages();
    return optionValue;
  }

  //Affichage emails envoyés
  if (optionValue == "Emails envoyés") {
    document.getElementById("Envoyes").style.display = "block";
    document.getElementById("Recu").style.display = "none";

    return optionValue;
  }
}

//////////////////////////////////////////////////////////////////////////////
//Partie projet 2

// Generate RSA key pair for encryption and decryption

async function sendKeys(){
  try{
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
      body: JSON.stringify(keys), 
    });

    if(response.ok){
      console.log("Keys were sent.");
      sendKeysExecuted = true;
    } else{
      console.error("Could not send keys:", response.statusText);
    }
  }catch(error){
    console.error("Could not send keys:", error);
  }
}

var receiverPublicKey = null;
var privateKey = null;

async function getReceiverPublicKey(){
  try{
    const response = await fetch("/getReceiverPublicKey", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if(response.ok){
      const receiverPublicKeyPem = await response.text();
      
      // Convert PEM keys to Forge objects
      receiverPublicKey = forge.pki.publicKeyFromPem(receiverPublicKeyPem);
      
      console.log("Receiver public Key:", receiverPublicKeyPem);
      console.log("Public key:", receiverPublicKey);

    } else{
      console.error("Could not get private key:", response.statusText);
    }
  } catch(error){
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
      body: JSON.stringify(encryptedData), // Convert the message object to JSON string and include it as the request body
    });

    // Check the response status
    if (response.ok) {
      // Request was successful
      console.log("Le message a été envoyé avec succès");
    } else {
      // Request failed
      console.error("Le message n'a pas pu être envoyé:", response.statusText);
    }
  } catch (error) {
    console.error("Le message n'a pas pu être envoyé:", error);
  }
}

async function getPrivateKey(){
  try{
    if(!sendKeysExecuted){
      await sendKeys();
    }

    const response = await fetch("/getPrivateKey", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if(response.ok){
      const privateKeyPem = await response.text();

      // Convert PEM string to Forge private key object
      privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    } else{
      console.error("Could not get private key:", response.statusText);
    }
  } catch(error){
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

      // Access the "Tableau" array from the JSON data
      const tableauArray = decryption(privateKey, messagesData);

      // Access the element in the DOM where you want to display the JSON data
      const outputElement = document.getElementById("Recu");

      // Clear any existing content in the outputElement
      outputElement.innerHTML = "";

      // Loop through the array and create HTML elements to display the data
      tableauArray.forEach((item) => {
        // Create container div for each message
        if(item.contact && item.titre && item.message != undefined){
        const messageContainer = document.createElement("div");
        messageContainer.setAttribute("class", "Carte");
        messageContainer.setAttribute(
          "onclick",
          `messageRecu('${item.contact}', '${item.titre}', '${item.message}')`
        );

        // Create contact element
        const a = document.createElement("a");
        const br = document.createElement("br");
        const p = document.createElement("p");

        const contact = document.createTextNode(item.contact);
        const titre = document.createTextNode(item.titre);
        const message = document.createTextNode(item.message);

        messageContainer.appendChild(a);
        a.appendChild(contact);
        a.appendChild(br);
        a.appendChild(titre);
        messageContainer.appendChild(p);
        p.appendChild(message);
        p.setAttribute("style", "display:none;");

        // Append the message container to the outputElement
        outputElement.appendChild(messageContainer);
       }
      });
    } else {
      // Request failed
      console.error(
        "Les messages n'ont pas pu être reçus:",
        response.statusText
      );
    }
  } catch (error) {
    console.error("Les messages n'ont pas pu être reçus:", error);
  }
}

const encryption = (receiverPublicKey, email) => {
  // Create variables that contain the properties that need to be encrypted
  const contact = email.contact;
  const titre = email.titre;
  const message = email.message;

  console.log("Adresse: ", contact);

  // Convert input data to binary using UTF-8 encoding
  const contactBytes = forge.util.encodeUtf8(contact);
  const titreBytes = forge.util.encodeUtf8(titre);
  const messageBytes = forge.util.encodeUtf8(message);

  // Encrypt the message properties using the RSA public key
  const encryptedContact = receiverPublicKey.encrypt(contactBytes, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
  });
  const encryptedTitre = receiverPublicKey.encrypt(titreBytes, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
  });
  const encryptedMessage = receiverPublicKey.encrypt(messageBytes, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
  });

  // Convert the encrypted binary data to Base64 strings
  const encryptedContactBase64 = forge.util.encode64(encryptedContact);
  const encryptedTitreBase64 = forge.util.encode64(encryptedTitre);
  const encryptedMessageBase64 = forge.util.encode64(encryptedMessage);

  // Create a new object with encrypted properties
  const encryptedData = {
    contact: encryptedContactBase64,
    titre: encryptedTitreBase64,
    message: encryptedMessageBase64,
  };

  return encryptedData;
};

const decryption = (privateKey, messagesData) => {
  const decryptedData = messagesData.map((encryptedData) => {
    // Convert Base64 strings back to binary data
    const decodedContactBytes = forge.util.decode64(encryptedData.contact);
    const decodedTitreBytes = forge.util.decode64(encryptedData.titre);
    const decodedMessageBytes = forge.util.decode64(encryptedData.message);

    const decryptedContact = privateKey.decrypt(decodedContactBytes, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
    });
    const decryptedTitre = privateKey.decrypt(decodedTitreBytes, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
    });
    const decryptedMessage = privateKey.decrypt(decodedMessageBytes, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
    });

    console.log(decryptedMessage);

    return {
      contact: decryptedContact,
      titre: decryptedTitre,
      message: decryptedMessage,
    };
  });  

  return decryptedData;
};