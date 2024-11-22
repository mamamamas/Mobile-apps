const express = require("express");
const SerialPort = require("serialport");
const Readline = require("@serialport/parser-readline");

const app = express();


// Set up serial communication with Arduino
const arduinoPort = new SerialPort("COM3", { baudRate: 9600 });
const parser = arduinoPort.pipe(new Readline({ delimiter: "\r\n" }));

// Log and parse data from Arduino
parser.on("data", (data) => {
  console.log("Received from Arduino:", data);

  const weightMatch = data.match(/Weight: ([\d.]+)/);
  const heightMatch = data.match(/Height: ([\d.]+)/);

  if (weightMatch && heightMatch) {
    const weight = parseFloat(weightMatch[1]);
    const height = parseFloat(heightMatch[1]);

    // Log the parsed data
    console.log("Parsed Weight:", weight, "kg");
    console.log("Parsed Height:", height, "cm");
  }
});

