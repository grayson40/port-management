const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

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
    password: process.env.MYSQL_PASSWORD,
    database: 'port_management'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Server!');
});

app.set('view engine', 'ejs');
app.set('views', '../views');

//Serve views for each page
app.get('/', (req, res) => {
    res.render("index");
});

app.get('/ship_registration', (req, res) => {
    res.render("ship_registration");
});

app.get('/container_company_registration', (req, res) => {
    res.render("container_company_registration");
});

app.get('/crane_operator', (req, res) => {
    res.render("crane_operator");
});

app.get('/port_entry', (req, res) => {
    res.render("port_entry");
});

app.get('/port_exit', (req, res) => {
    res.render("port_exit");
});

app.get('/truck_driver_checkin', (req, res) => {
    res.render("truck_driver_checkin");
});

app.get('/truck_registration', (req, res) => {
    res.render("truck_registration");
});

app.get('/port_admin_management', (req, res) => {
    res.render("port_admin_management");
});

// Fetch Ship Details
app.get('/api/ships', (req, res) => {
    const query = 'SELECT * FROM Ships';
    connection.query(query, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.get('/api/ships/:shipId', (req, res) => {
    const shipId = req.params.shipId;
    const query = 'SELECT * FROM Ships WHERE shipID = ?';
    connection.query(query, [shipId], (err, results) => {
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

app.get('/api/containers/:containerId', (req, res) => {
    const containerId = req.params.containerId;
    const query = 'SELECT * FROM Containers WHERE containerID = ?';
    connection.query(query, [containerId], (err, results) => {
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

app.get('/api/trucks/:truckId', (req, res) => {
    const truckId = req.params.truckId;
    const query = 'SELECT * FROM Trucks WHERE truckID = ?';
    connection.query(query, [truckId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});


// Helper functions
function sendServerError(res, err) {
    console.error('An error occurred: ' + err.message);
    res.status(500).send('Error processing your request');
}

function rollbackTransaction(res, err) {
    console.error('An error occurred: ' + err.message);
    connection.rollback(() => res.status(500).send('Error processing your request'));
}

function commitTransaction(res, message) {
    connection.commit(err => {
        if (err) {
            console.error('An error occurred: ' + err.message);
            return connection.rollback(() => res.status(500).send('Error processing your request'));
        }
        res.json({ message: message });
    });
}

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

function handlePortEntry(shipId, res) {
    const findShipQuery = 'SELECT berthID FROM ships WHERE shipID = ?';
    connection.query(findShipQuery, [shipId], (err, ships) => {
        if (err) return sendServerError(res, err);
        if (ships.length === 0) return res.status(500).send('No ship found with the provided ID');

        const berthId = ships[0].berthID;
        if (berthId !== null) return res.status(500).send('The ship is already in a berth');

        const findBerthQuery = 'SELECT berthID FROM berths WHERE isOccupied = 0 LIMIT 1';
        connection.query(findBerthQuery, (err, berths) => {
            if (err) return sendServerError(res, err);
            if (berths.length === 0) return res.status(500).send('No empty berths available');

            const berthId = berths[0].berthID;
            updateShipAndBerthTables(shipId, berthId, res);
        });
    });
}

function updateShipAndBerthTables(shipId, berthId, res) {
    const updateShipQuery = 'UPDATE ships SET enteredPort = NOW(), berthID = ?, exitedPort = NULL WHERE shipID = ?';
    const updateBerthQuery = 'UPDATE berths SET isOccupied = 1, shipID = ? WHERE berthID = ?';

    connection.beginTransaction(err => {
        if (err) return sendServerError(res, err);
        connection.query(updateShipQuery, [berthId, shipId], err => {
            if (err) return rollbackTransaction(res, err);
            connection.query(updateBerthQuery, [shipId, berthId], err => {
                if (err) return rollbackTransaction(res, err);
                commitTransaction(res, 'Port entry recorded successfully. Berth number: ' + berthId);
            });
        });
    });
}

app.post('/submit-port-entry', (req, res) => {
    const shipId = req.body.shipId;
    handlePortEntry(shipId, res);
});

function handlePortExit(shipId, res) {
    const findBerthQuery = 'SELECT berthID FROM ships WHERE shipID = ?';
    connection.query(findBerthQuery, [shipId], (err, ships) => {
        if (err) return sendServerError(res, err);
        if (ships.length === 0) return res.status(500).send('No ship found with the provided ID');

        const berthId = ships[0].berthID;
        if (berthId === null) return res.status(500).send('The ship is not currently in a berth');

        freeUpBerthAndUpdateShip(shipId, berthId, res);
    });
}

function freeUpBerthAndUpdateShip(shipId, berthId, res) {
    const updateShipQuery = 'UPDATE ships SET exitedPort = NOW(), berthID = NULL WHERE shipID = ?';
    const updateBerthQuery = 'UPDATE berths SET isOccupied = 0, shipID = NULL WHERE berthID = ?';

    connection.beginTransaction(err => {
        if (err) return sendServerError(res, err);
        connection.query(updateShipQuery, [shipId], err => {
            if (err) return rollbackTransaction(res, err);
            connection.query(updateBerthQuery, [berthId], err => {
                if (err) return rollbackTransaction(res, err);
                commitTransaction(res, 'Port exit recorded successfully. Berth ' + berthId + ' is now available.');
            });
        });
    });
}

app.post('/submit-port-exit', (req, res) => {
    const shipId = req.body.shipId;
    handlePortExit(shipId, res);
});

app.post('/submit-container-company-registration', (req, res) => {
    const { companyName, sourceId, destinationId, storageArea, sourceType, destinationType } = req.body;

    const query = 'INSERT INTO containers (companyName, sourceID, destinationID, sourceType, destinationType, storageAreaAddress) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(query, [companyName, sourceId, destinationId, sourceType, destinationType, storageArea], (err, results, fields) => {
        if (err) {
            console.error(err.message);
            res.send('Error occurred');
        } else {
            res.send('Container registered successfully');
        }
    });
});

app.post('/submit-truck-registration', (req, res) => {
    const { truckName } = req.body;

    // Check if the truck already exists
    const checkQuery = 'SELECT * FROM trucks WHERE truckName = ?';
    connection.query(checkQuery, [truckName], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.status(400).send('Truck already registered');
        } else {
            // Insert new truck
            const insertQuery = 'INSERT INTO trucks (truckName) VALUES (?)';
            connection.query(insertQuery, [truckName], (err, results) => {
                if (err) {
                    console.error(err.message);
                    res.send('Error occurred');
                } else {
                    res.send('Truck registered successfully');
                }
            });
        }
    });
});

app.post('/submit-truck-driver-checkin', (req, res) => {
    const truckId = req.body.truckId;

    // Check if the truck ID exists in the trucks table
    const truckQuery = 'SELECT * FROM trucks WHERE truckID = ?';
    connection.query(truckQuery, [truckId], (err, truckResults) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Server error occurred');
        }

        if (truckResults.length === 0) {
            return res.status(404).send('Truck ID not found');
        }

        // Update the enteredPort time to NOW()
        const updateQuery = 'UPDATE trucks SET enteredPort = NOW() WHERE truckID = ?';
        connection.query(updateQuery, [truckId], (err, updateResults) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Server error occurred');
            }

            // Find the container ID on the truck
            const incomingContainers = 'SELECT storageAreaAddress FROM containers WHERE sourceType="truck" AND sourceID=?';
            connection.query(incomingContainers, [truckId], (err, inContainers) => {
                // log the error message and send a 500 status code with a message
                if (err) {
                    console.error(err.message);
                    return res.status(500).send('Server error occurred');
                }

                // If no incoming containers are found
                if (inContainers.length === 0) {
                    // Define a query to select container IDs from the containers table where the destination ID matches the truck ID
                    const outgoingContainters = 'SELECT storageAreaAddress FROM containers WHERE destinationType="truck" AND destinationID=?';

                    // Execute the query
                    connection.query(outgoingContainters, [truckId], (err, outContainers) => {
                        // log the error message and send a 500 status code with a message
                        if (err) {
                            console.error(err.message);
                            return res.status(500).send('Server error occurred');
                        }

                        // If no containers are found, send a 404 status code with a message
                        if (outContainers.length === 0) {
                            return res.status(404).send('No containers found');
                        }

                        // Get the storage area address from the first container in the results
                        const storageAddress = outContainers[0].storageAreaAddress;

                        // Create a directions message
                        const directions = `Proceed to storage area ${storageAddress} for loading.`;

                        // Send back the response with a success message and the directions
                        res.json({ message: 'Check-in successful', directions: directions });
                    });
                } else {
                    // Get the storage area address from the first container in the results
                    const address = inContainers[0].storageAreaAddress;

                    // Create a directions message
                    const directions = `Proceed to storage area ${address} for unloading.`;

                    // Send back the response with a success message and the directions
                    res.json({ message: 'Check-in successful', directions: directions });
                }
            });
        });
    });
});

app.post('/submit-crane-operation', (req, res) => {
    const { vehicleType, vehicleId } = req.body;

    // Check the storage area to see if the container needs to be loaded or unleaded
    const storageAreaQuery = 'SELECT * FROM storageArea WHERE containerID IS NOT NULL';


    // if (vehicleType === 'ship') {
    //     // Query to get containers from a ship
    //     query = 'SELECT * FROM containers WHERE sourceType = ship AND sourceID = ?';
    // } else {
    //     // Query to get containers from a truck
    //     query = 'SELECT * FROM containers WHERE sourceType = truck AND sourceID = ?';
    // }

    connection.query(storageAreaQuery, (err, storageResults) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Server error occurred');
        }

        if (storageResults.length === 0) {
            // We're loading into storage

            let query;
            if (vehicleType === 'ship') {
                // Query to get containers from a ship
                query = 'SELECT * FROM containers WHERE sourceType = "ship" AND sourceID = ?';
            } else {
                // Query to get containers from a truck
                query = 'SELECT * FROM containers WHERE sourceType = "truck" AND sourceID = ?';
            }

            // Execute query and update storage area and container
            connection.query(query, [vehicleId], (err, containerResults) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).send('Server error occurred');
                }

                if (containerResults.length === 0) {
                    return res.status(404).send('No containers found');
                }

                const containerID = containerResults[0].containerID;
                const storageAddress = containerResults[0].storageAreaAddress;

                const storageUpdateQuery = 'UPDATE storageArea SET containerID = ? WHERE storageAddress = ?';

                connection.query(storageUpdateQuery, [containerID, storageAddress], (err, storageUpdateResult) => {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).send('Server error occurred');
                    }
                })

                const containerUpdateQuery = 'UPDATE containers SET status = "storage" WHERE containerID = ?'

                connection.query(containerUpdateQuery, [containerID], (err, containerUpdateResult) => {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).send('Server error occurred');
                    }
                })
                const message = `Container ${containerID} unloaded into storage area ${storageAddress} from ${vehicleType} ${vehicleId}`;
                res.json({ message: message });
            })
        } else {
            // We're unloading from storage
            let query;
            if (vehicleType === 'ship') {
                // Query to get containers from a ship
                query = 'SELECT * FROM containers WHERE destinationType = "ship" AND destinationID = ?';
            } else {
                // Query to get containers from a truck
                query = 'SELECT * FROM containers WHERE destinationType = "truck" AND destinationID = ?';
            }

            // Execute query and update storage area and container
            connection.query(query, [vehicleId], (err, containerResults) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).send('Server error occurred');
                }

                if (containerResults.length === 0) {
                    return res.status(404).send('No containers found');
                }

                const containerID = containerResults[0].containerID;
                const storageAddress = containerResults[0].storageAreaAddress;

                const storageUpdateQuery = 'UPDATE storageArea SET containerID = NULL WHERE storageAddress = ?';

                connection.query(storageUpdateQuery, [storageAddress], (err, storageUpdateResult) => {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).send('Server error occurred');
                    }
                })

                const containerUpdateQuery = 'UPDATE containers SET status = "loaded" WHERE containerID = ?'

                connection.query(containerUpdateQuery, [containerID], (err, containerUpdateResult) => {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).send('Server error occurred');
                    }
                })
                const message = `Container ${containerID} loaded from storage area ${storageAddress} into ${vehicleType} ${vehicleId}`;
                res.json({ message: message });
            })
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
