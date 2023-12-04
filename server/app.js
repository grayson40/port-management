const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const port = 3000;

// MySQL connection settings
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Sta71750!',
    database: 'port_management'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Server!');
});


app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/submit-ship-registration', (req, res) => {
    // Retrieve ship name and shipId from form data
    const { shipName, shipId } = req.body;

    const query = 'INSERT INTO ships (shipName, shipID) VALUES (?, ?)';
    connection.query(query, [shipName, shipId], (err, results, fields) => {
        if (err) {
            console.error(err.message);
            res.send('Error occurred');
        } else {
            res.send('Ship registered successfully');
        }
    });
});

app.post('/submit-port-entry', (req, res) => {
    // Retrieve shipId from form data
    const shipId = req.body.shipId;

    // Get current date and time
    const now = new Date();
    const enteredTime = now.toISOString().slice(0, 19).replace('T', ' ');

    // SQL query to insert data
    const query = 'UPDATE ships SET enteredPort = ? WHERE shipID = ?';

    connection.query(query, [enteredTime, shipId], (err, result) => {
        if (err) {
            console.error('An error occurred: ' + err.message);
            res.status(500).send('Error processing your request');
        } else {
            res.send('Port entry recorded successfully');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
