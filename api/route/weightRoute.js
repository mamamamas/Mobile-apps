// const express = require('express');
// const router = express.Router();
// const SerialPort = require('serialport').SerialPort;
// const ReadlineParser = require('@serialport/parser-readline').ReadlineParser;

// let serialPort;
// try {
//     serialPort = new SerialPort({ path: 'COM3', baudRate: 9600 });
// } catch (error) {
//     console.error("Can't find COM3 port. Please ensure the device is connected.");
// }

// const parser = serialPort ? serialPort.pipe(new ReadlineParser({ delimiter: '\n' })) : null;

// // Route to get weight and height data and calculate BMI
// router.get('/bmi', (req, res) => {
//     if (!serialPort || !parser) {
//         return res.status(500).json({ error: "Can't find COM3 port. Please ensure the device is connected." });
//     }

//     let weightReceived = false;
//     let heightReceived = false;
//     let weight, height;

//     const timeout = setTimeout(() => {
//         if (!weightReceived || !heightReceived) {
//             res.status(500).json({ error: 'Timeout: Failed to receive weight or height data' });
//         }
//     }, 30000); // 30 seconds timeout

//     parser.on('data', data => {
//         const stringData = data.toString().trim();
//         console.log('Raw data received:', stringData);

//         if (stringData.startsWith('Weight:')) {
//             const weightMatch = stringData.match(/Weight:\s*(-?\d+(\.\d+)?)/);
//             if (weightMatch) {
//                 weight = parseFloat(weightMatch[1]);
//                 weightReceived = true;
//                 console.log('Valid weight received:', weight);
//             }
//         } else if (stringData.startsWith('Height:')) {
//             const heightMatch = stringData.match(/Height:\s*(-?\d+(\.\d+)?)/);
//             if (heightMatch) {
//                 height = parseFloat(heightMatch[1]);
//                 heightReceived = true;
//                 console.log('Valid height received:', height);
//             }
//         }

//         if (weightReceived && heightReceived) {
//             clearTimeout(timeout);
//             const bmi = calculateBMI(weight, height);
//             res.json({ weight, height, bmi });
//             parser.removeAllListeners('data');
//         }
//     });
// });

// function calculateBMI(weight, height) {
//     // BMI formula: weight (kg) / (height (m))^2
//     const heightInMeters = height / 100;
//     return (weight / (heightInMeters * heightInMeters)).toFixed(2);
// }

// module.exports = router;            