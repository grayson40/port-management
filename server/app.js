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
        res.json({message: message});
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
    const { containerId, sourceId, destinationId, storageArea } = req.body;

    const query = 'INSERT INTO containers (containerID, sourceID, destinationID, storageAreaAddress) VALUES (?, ?, ?, ?)';
    connection.query(query, [containerId, sourceId, destinationId, storageArea], (err, results, fields) => {
        if (err) {
            console.error(err.message);
            res.send('Error occurred');
        } else {
            res.send('Container registered successfully');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
