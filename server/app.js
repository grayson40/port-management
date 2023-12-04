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
    password: '',
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
    console.log(req.body)
    const { shipName, shipId } = req.body; // Replace with actual input names

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

// Endpoint for form submission
app.post('/submit-port-entry', (req, res) => {
    const shipId = req.body.shipId; // Retrieve shipId from form data

    // SQL query to insert data
    const query = 'INSERT INTO port_entries (shipId) VALUES (?)';

    connection.query(query, [shipId], (err, result) => {
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
