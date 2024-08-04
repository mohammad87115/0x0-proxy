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
    // Boundary extraction
    const contentType = req.headers['content-type'];
    const boundary = contentType.split('; ')[1].replace('boundary=', '');

    // Parse file from the request body
    const bodyBuffer = Buffer.from(req.body);
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = bodyBuffer.split(boundaryBuffer);

    // Extract the file part from the body
    const filePart = parts.find(part => part.includes('Content-Disposition: form-data; name="file";'));

    if (!filePart) {
      return res.status(400).send('No file uploaded.');
    }

    // Extract file details
    const fileStartIndex = filePart.indexOf('\r\n\r\n') + 4;
    const fileBuffer = filePart.slice(fileStartIndex, filePart.length - 4); // -4 to remove trailing CRLF
    const fileNameMatch = filePart.toString().match(/filename="(.+?)"/);
    const fileName = fileNameMatch ? fileNameMatch[1] : 'uploadedfile';

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
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
