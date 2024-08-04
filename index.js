// server.js

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse incoming request bodies in a `Buffer`
// This is crucial for handling `multipart/form-data` directly
app.use(express.raw({
  type: 'multipart/form-data',
  limit: '10mb', // You can increase this limit based on your needs
}));

// Proxy route for handling file uploads
app.post('/upload', async (req, res) => {
  try {
    // Extract the boundary from the Content-Type header
    const contentType = req.headers['content-type'];
    const boundary = '--' + contentType.split('; ')[1].split('=')[1];

    // Convert the raw body to a string for easier manipulation
    const bodyString = req.body.toString('binary');

    // Split the body into parts using the boundary
    const parts = bodyString.split(boundary).filter(part => part !== '--\r\n' && part.trim());

    // Find the part that contains the file data
    const filePart = parts.find(part => part.includes('Content-Disposition: form-data; name="file";'));

    if (!filePart) {
      return res.status(400).send('No file uploaded.');
    }

    // Extract file details and content
    const fileNameMatch = filePart.match(/filename="(.+?)"/);
    const fileName = fileNameMatch ? fileNameMatch[1] : 'uploadedfile';

    // Find the start of the file content
    const fileContentStart = filePart.indexOf('\r\n\r\n') + 4;
    const fileContentEnd = filePart.lastIndexOf('\r\n--');

    // Extract the file buffer from the part
    const fileBuffer = Buffer.from(filePart.slice(fileContentStart, fileContentEnd), 'binary');

    // Prepare form data for the request to 0x0.st
    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);

    // Make the request to 0x0.st
    const response = await axios.post('https://0x0.st', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    // Send back the response from 0x0.st
    res.send(response.data);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('An error occurred while uploading the file.');
  }
});

// Start the server
app.listen(PORT, () =>
