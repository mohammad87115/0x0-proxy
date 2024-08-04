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
  limit: '10mb', // Adjust the size limit as needed
}));

// Proxy route for handling file uploads
app.post('/upload', async (req, res) => {
  try {
    // Boundary extraction
    const contentType = req.headers['content-type'];
    const boundary = contentType.split('; ')[1].replace('boundary=', '');

    // Convert boundary to Buffer
    const boundaryBuffer = Buffer.from(`--${boundary}`);

    // Find the file part in the multipart buffer
    const parts = splitBuffer(req.body, boundaryBuffer);

    const filePart = parts.find(part => part.includes('Content-Disposition: form-data; name="file";'));

    if (!filePart) {
      return res.status(400).send('No file uploaded.');
    }

    // Extract file details
    const fileDetails = parseContentDisposition(filePart);
    if (!fileDetails) {
      return res.status(400).send('Invalid file part.');
    }

    // Extract file buffer
    const fileBuffer = filePart.slice(fileDetails.fileStartIndex, filePart.length - 4); // -4 to remove trailing CRLF

    // Prepare form data for the request to 0x0.st
    const formData = new FormData();
    formData.append('file', fileBuffer, fileDetails.fileName);

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

// Function to split a buffer by a boundary
function splitBuffer(buffer, boundary) {
  const parts = [];
  let offset = 0;

  while (offset < buffer.length) {
    const nextBoundaryIndex = buffer.indexOf(boundary, offset);

    if (nextBoundaryIndex === -1) {
      parts.push(buffer.slice(offset));
      break;
    }

    parts.push(buffer.slice(offset, nextBoundaryIndex));
    offset = nextBoundaryIndex + boundary.length + 2; // Skip CRLF after boundary
  }

  return parts;
}

// Function to parse the Content-Disposition header
function parseContentDisposition(buffer) {
  const contentDispositionHeader = buffer.toString().match(/Content-Disposition: form-data; name="file"; filename="(.+?)"/);

  if (!contentDispositionHeader) {
    return null;
  }

  const fileName = contentDispositionHeader[1];
  const fileStartIndex = buffer.indexOf('\r\n\r\n') + 4;

  return { fileName, fileStartIndex };
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
