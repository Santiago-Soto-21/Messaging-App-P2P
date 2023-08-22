# Messaging-App-P2P

P2P messaging application that uses RSA and AES-256 encryption to send secure messages

 # Overview

 This messaging application enables users to send email messages securely using RSA encryption and Peer-to-Peer communication. Users can compose their desired emails via the email form on the client side (`script.js`). These emails are then encrypted and forwarded to the server side (`server.js`), where they are stored in a JSON file. Subsequently, the recipient's server retrieves the encrypted email, presenting it within the inbox section of the recipient's `index.ejs` file.

 ## Client side
 ### Generation and fetching of RSA key pair
 * The Forge library is used to generate a RSA key pair with a length of 2048 bits. The private and public keys are stored in PEM format (to prevent the keys from corrupting) inside a JavaScript object named `keys` and a POST request is made to the server's `/addKeys` route using the fetch API. The generated key pair is sent as a JSON string in the request body. If the response status is OK (HTTP 200), it logs a success message indicating that the keys were sent. It also sets a boolean flag sendKeysExecuted to true to prevent sending keys multiple times.

 * Both the receiver's public key (the user who we want to receiver the email) and the user's private key are fetched from the server by the way of GET requests to the `/getReceiverPublicKey` and `/getPrivateKey` routes respectively using the fetch API. They are then converted into their original Forge object form to encrypt and decrypt emails received.

   - Note: Before fetching the private key, `sendKeys()` function is called and awaited if `sendKeysExecuted` flag is false in order to make sure a private key is generated before retrieving it.

 ### Other POST requests
 * In order to be able to display what emails were sent by the user, the `saveMessage` function is defined to save a sent email to the server's database. It sends a POST request to the `/saveLetters` route using the fetch API. The sent email is converted to a JSON string and included in the request body.

 * In order to send an encrypted email to another user, the `sendMessage` function is defined to encrypt and send an email to the server's database. It waits until the receiver's public key is fetched using the getReceiverPublicKey function. It checks if the receiver's public key is available before proceeding with encryption. The email is encrypted using the receiver's public key with the `encryption` function. A POST request is sent to the `/addLetters` route with the encrypted email as a JSON string in the request body.

 ### Other GET requests
 * The `getSavedMessages` function is defined to fetch saved sent emails from the server's database. It sends a GET request to the `/getSavedLetters` route using the fetch API. The response is parsed as JSON, and the retrieved messages are processed for display. The HTML elements for displaying sent emails are created dynamically and added to the DOM based on the retrieved data. The `messageReceived` function is invoked when a message container is clicked, passing the contact, title, and message data in order to display the contents of the sent email.

 * The `getMessages` function is defined to fetch and decrypt received emails from the server's database. It waits until the user's private key is fetched using the `getPrivateKey` function. It checks if the private key is available before proceeding with decryption. The inbox messages are fetched from the `/getLetters` route using a GET request. The response is parsed as JSON, and the retrieved messages are decrypted using the decryption function. Similar to the saved emails, the HTML elements for displaying received emails are created and added to the DOM based on the decrypted data.

 ### RSA encryption and decryption
 * The `encryption` function takes the receiver's public key and an email object as input. It extracts the email's contact, title, and message properties to be encrypted. The content is converted to binary data using UTF-8 encoding. Each property is individually encrypted using the receiver's public key and the RSA-OAEP encryption scheme with SHA-256 hashing. The encrypted binary data is then converted to Base64 strings to prevent data corruption. An object containing the encrypted properties (contact, title, and message) is created and returned.

 * The `decryption` function takes the user's private key and an array of encrypted email objects (messagesData) as input. It loops through each encrypted email object in the array. The encrypted Base64 strings are decoded back to binary data. Each encrypted property (contact, title, and message) is decrypted using the user's private key and the RSA-OAEP scheme with SHA-256 hashing. The decrypted content is returned as a new object with contact, title, and message properties.

 ## Server side

 ### Databases
 * This message application has 3 databases: `inbox.json`, `outbox.json` and `sent.json`. They are all JSON arrays that contain the `received messages`, the `encrypted sent messages` (which will be be sent to another server) and the `sent messages` (not encrypted, just for diplaying purposes) respectively.

 ### Route handlings
 * `Route for Adding Keys (/addKeys)`: This route handles the process of adding generated RSA keys to a file. It listens for a POST request and expects the keys to be included in the request body. The code first checks if the `keys.pem` file already exists using the `fs.access method`. If the file does not exist (indicated by an error), the code proceeds to store the keys. The user's private key is encrypted using the `encryptData` function. The public key and encrypted private key are then stored inside the `keys.pem` file using the `fs.writeFile` method. If the file already exists, a message is logged indicating that the keys already exist.

 * `Route to Save Sent Emails (/saveLetters)`: This route listens for a POST request when an email is sent. The code reads the content of the `sent.json` file using `fs.readFileSync`. The content is parsed into a JavaScript object named messagesData. The encrypted email data received in the request body is added to the beginning of the sent array in messagesData. The updated messagesData is converted back to a JSON string with proper indentation. The updated JSON string is written back to the `sent.json` file using `fs.writeFileSync`. A success response with a status code of 201 (Created) is sent back to the client. 

 * `Route to Add Encrypted Email (/addLetters)`: Similar to the previous route, this route also listens for a POST request. The code reads the content of the `outbox.json` file using `fs.readFileSync`. The content is parsed into a JavaScript object named messagesData. The encrypted email data received in the request body is added to the beginning of the `outbox` array in messagesData. The updated messagesData is converted back to a JSON string with proper indentation. The updated JSON string is written back to the `outbox.json` file using `fs.writeFileSync`. A success response with a status code of 201 (Created) is sent back to the client.

 * `Route to Merge Email Data (/mergeLetters)`: This route listens for a GET request and is intended to be used by `peer servers`. The code reads the content of the `outbox.json` file, which contains email data. The content is parsed into a JavaScript object named messagesData. The server responds by sending the `outbox` array from the messagesData object as a JSON response. This enables `peers` to access the server's email data.

 * `Route to Get Public Key (/getPublicKey)`: This route listens for a GET request and is used to share the public key with other `peers`. The code reads the content of the `keys.pem` file, which contains the public and private keys. The content is parsed into a JavaScript object named `keys`. The public key is extracted from the keys object and sent as a response.

 * `Route to Get Decrypted Private Key (/getPrivateKey)`: This route listens for a GET request and is used to retrieve and decrypt the private key. The code reads the content of the `keys.pem` file, which contains the encrypted private key (encrypted with AES-256). The content is parsed into a JavaScript object named `keys`. The encrypted private key is decrypted using the `decryptData` function. The decrypted private key is sent as a response.

 * `Route to Get Receiver's Public Key (/getReceiverPublicKey)`: This route listens for a GET request and is used to retrieve the receiver's public key. The `getReceiverPublicKey` function is called with a `callback` to handle the result. Inside the `callback`, If an error occurs during the retrieval, an error message is logged, and a 500 status response is sent. If successful, the retrieved receiver's public key is sent as the response.

 * `Route to Get Saved Sent Emails (/getSavedLetters)`: This route listens for a GET request and retrieves saved sent emails from the `sent.json` file. The code reads the content of the `sent.json` file, which contains the saved sent emails. The content is parsed into a JavaScript object named messagesData. The saved sent emails are sent as a JSON response.

 * `Route to Get Emails from Inbox (/getLetters)`: This route listens for a GET request and retrieves received emails from the `inbox.json` file. The code reads the content of the `inbox.json` file, which contains the received emails. The content is parsed into a JavaScript object named messagesData. The received emails are sent as a JSON response.

 ### Requests
 * `Peers array and URL`: An array called `peers` is defined, containing `URLs` of `peer servers`. A variable `URL` is set to the server's `URL`, including the `port`.

 * `Peers and Refreshing Inbox`: A function named `refreshInbox` is defined to periodically refresh the server's `inbox` by merging email data from `peers`. Inside the function: The `currentPeer` is set to the `URL` of the first peer's mergeLetters route. If the `currentPeer` is the same as the server's mergeLetters route, the `peers` array is rotated using `push` and `shift`, and the function returns. If not, the `inbox.json` file is read and its content is parsed into the `myInbox` array. A request is made to the mergeLetters route of the current peer using the request library. If an error occurs during the request, it's logged to the console. Otherwise, the sender's `outbox` messages from the response body are parsed and stored in the `senderOutbox` array. The local `inbox` array is updated by adding non-duplicate emails from the sender's `outbox`. The local `inbox.json` file is updated with the merged array. It is important to note that `setInterval` function in `app.listen` calls `refreshInbox` every 5 seconds to keep the database updated.
 
 * `Function to Get Receiver's Public Key (getReceiverPublicKey)`: This function is responsible for retrieving the public key of the receiver from the `peer servers`. It takes a `callback` as an argument to handle the retrieved public key. Inside the function, the `currentPeer` is set to the `URL` of the first peer's getPublicKey route. If the `currentPeer` is the same as the server's getPublicKey route, the `peers` array is rotated using `push` and `shift`, and an error `callback` is returned. If not, a request is made to the current peer's getPublicKey route using the request library. If an error occurs during the request, the provided `callback` is called with the error. If successful, the public key is extracted from the response body, and the provided `callback` is called with no error and the retrieved public key.

 ### AES-256 encryption (encryption.js file)
 * `Calculating the AES Key and IV (generateAESKey function)`: The `generateAESKey` function uses the Node.js crypto module to generate an `AES key` and `IV` for encryption. The `secret_key` and `secret_iv` are used as inputs to the hash function to derive the `AES key` and `IV`. The calculated `AES key` is a 256-bit (32-byte) key, and the `IV` is a 128-bit (16-byte) value. 

 * `Checking and Creating AESKey.env File`: The code uses the `fs.access` method to check if the `AESKey.env` file exists. If the file doesn't exist, the code generates an `AES key` and `IV` using the `generateAESKey` function. The generated `AES key` and `IV` are stored in the `AESKey.env` file as environment variables.

 * `Encrypting Data (encryptData function)`: The `encryptData` function reads the `AES key` and `IV` from environment variables using `dotenv`. It creates a cipher using `crypto.createCipheriv` with the specified encryption method (encryption_method), `AES key`, and `IV`. The data is encrypted in hexadecimal format and then converted to a base64-encoded string. The encrypted data is returned.

 * `Decrypting Data (decryptData function)`: The `decryptData` function reads the `AES key` and `IV` from environment variables using `dotenv`. It decodes the base64-encoded input data. It creates a decipher using `crypto.createDecipheriv` with the same encryption method, `AES key`, and `IV`. The data is decrypted from hexadecimal format back to UTF-8. The decrypted data is returned.

     - Note: `AES key` and `IV` are stored for the purpose of decryption. The same `AES key` and `IV` that were used for encryption need to be used. Therefore, by storing these values, it ensures that the data can be consistently decrypted whenever needed, even if the application is restarted or the encryption/decryption process is performed by different components.


 # Running the application

 1. Clone the repository
    
    ```
    > git clone https://github.com/Santiago-Soto-21/Messaging-App-P2P.git
    ```

2. Execute `npm install -y`
    ```
    > npm install -y
    ```

3. Change port if necessary (optional) and modify the `peers` array on the `server.js` file to add or remove the URL of a peer. This array contains the peers you would like to communicate with.
    ```js
    // Define an array of peers and a URL
    const port = "3000" // <-- Change port to the one you want to use
    const peers = ["http://127.0.0.1:3001", "http://127.0.0.1:3000"]; // <-- Add peer here
    var URL = "http://127.0.0.1:" + port;
    ```

4. Start your server
    ```
    > node server.js
    ```

5. Open your page to http://127.0.0.1:3000 in your browser

6. Repeat steps 1 to 5, but with the peer you would like to communicate with 

    * For example, we want to communicate with the peer http://127.0.0.1:3001. To do so, we need to redo steps 1 to 5 but change the `port` number to `3001` and modify the `peers` array as to establish communication with http://127.0.0.1:3000 :

        ```js
        // Define an array of peers and a URL
        const port = "3001" // <-- Change port to the one you want to use
        const peers = ["http://127.0.0.1:3000", "http://127.0.0.1:3001"]; // <-- Add peer here
        var URL = "http://127.0.0.1:" + port;
        ```
        


