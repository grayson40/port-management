const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const port = 3000;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('../'));

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

// Fetch Ship Details
app.get('/api/ships', (req, res) => {
    const query = 'SELECT * FROM Ships';
    connection.query(query, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Fetch Berth Overview
app.get('/api/berths', (req, res) => {
    const query = 'SELECT * FROM Berths';
    connection.query(query, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Fetch Container Insights
app.get('/api/containers', (req, res) => {
    const query = 'SELECT * FROM Containers';
    connection.query(query, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Fetch Truck Information
app.get('/api/trucks', (req, res) => {
    const query = 'SELECT * FROM Trucks';
    connection.query(query, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});


app.post('/submit-ship-registration', (req, res) => {
    // Retrieve ship name and shipId from form data
    const { shipName, shipSize } = req.body;

    const query = 'INSERT INTO ships (shipName, shipSize) VALUES (?, ?)';
    connection.query(query, [shipName, shipSize], (err, results, fields) => {
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

    // SQL query to find an empty berth
    const findBerthQuery = 'SELECT berthID FROM berths WHERE isOccupied = 0 LIMIT 1';

    connection.query(findBerthQuery, (err, result) => {
        if (err) {
            console.error('An error occurred: ' + err.message);
            res.status(500).send('Error processing your request');
        } else if (result.length === 0) {
            res.status(500).send('No empty berths available');
        } else {
            const berthId = result[0].berthID;

            // SQL query to update the ships table
            const updateShipQuery = 'UPDATE ships SET enteredPort = ?, berthID = ? WHERE shipID = ?';

            // SQL query to mark the berth as occupied
            const updateBerthQuery = 'UPDATE berths SET isOccupied = 1 WHERE berthID = ?';

            // Start a transaction
            connection.beginTransaction((err) => {
                if (err) {
                    console.error('An error occurred: ' + err.message);
                    res.status(500).send('Error processing your request');
                } else {
                    // Update the ships table
                    connection.query(updateShipQuery, [enteredTime, berthId, shipId], (err, result) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error('An error occurred: ' + err.message);
                                res.status(500).send('Error processing your request');
                            });
                        }

                        // Mark the berth as occupied
                        connection.query(updateBerthQuery, [berthId], (err, result) => {
                            if (err) {
                                return connection.rollback(() => {
                                    console.error('An error occurred: ' + err.message);
                                    res.status(500).send('Error processing your request');
                                });
                            }

                            // Commit the transaction
                            connection.commit((err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        console.error('An error occurred: ' + err.message);
                                        res.status(500).send('Error processing your request');
                                    });
                                }

                                // Send the berth number to the client
                                res.send('Port entry recorded successfully. Berth number: ' + berthId);
                            });
                        });
                    });
                }
            });
        }
    });
});

app.post('/submit-port-exit', (req, res) => {
    // Retrieve shipId from form data
    const shipId = req.body.shipId;

    // SQL query to find the berth occupied by the ship
    const findBerthQuery = 'SELECT berthID FROM ships WHERE shipID = ?';

    connection.query(findBerthQuery, [shipId], (err, result) => {
        if (err) {
            console.error('An error occurred: ' + err.message);
            res.status(500).send('Error processing your request');
        } else if (result.length === 0) {
            res.status(500).send('No ship found with the provided ID');
        } else {
            const berthId = result[0].berthID;

            // SQL query to update the ships table
            const updateShipQuery = 'UPDATE ships SET exitedPort = NOW() WHERE shipID = ?';

            // SQL query to free up the berth
            const updateBerthQuery = 'UPDATE berths SET isOccupied = 0 WHERE berthID = ?';

            // Start a transaction
            connection.beginTransaction((err) => {
                if (err) {
                    console.error('An error occurred: ' + err.message);
                    res.status(500).send('Error processing your request');
                } else {
                    // Update the ships table
                    connection.query(updateShipQuery, [shipId], (err, result) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error('An error occurred: ' + err.message);
                                res.status(500).send('Error processing your request');
                            });
                        }

                        // Free up the berth
                        connection.query(updateBerthQuery, [berthId], (err, result) => {
                            if (err) {
                                return connection.rollback(() => {
                                    console.error('An error occurred: ' + err.message);
                                    res.status(500).send('Error processing your request');
                                });
                            }

                            // Commit the transaction
                            connection.commit((err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        console.error('An error occurred: ' + err.message);
                                        res.status(500).send('Error processing your request');
                                    });
                                }

                                // Send a success message to the client
                                res.send('Port exit recorded successfully. Berth ' + berthId + ' is now available.');
                            });
                        });
                    });
                }
            });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
