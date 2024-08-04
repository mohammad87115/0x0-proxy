// server.js

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const app = express();
const PORT = 8080;

// Enable CORS for all routes
app.use(cors());

// Setup Multer for file uploads
const upload = multer({ dest: "tmp/" });

// Proxy route for handling file uploads
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    // Prepare the form data for the request to 0x0.st
    const formData = new FormData();
    formData.append("file", fs.createReadStream(req.file.path));

    // Make the request to 0x0.st
    const response = await axios.post("https://0x0.st", formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    // Remove the uploaded file from local storage
    fs.unlinkSync(req.file.path);

    // Send back the response from 0x0.st
    res.send(response.data);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("An error occurred while uploading the file.");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
