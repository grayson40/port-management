# Port Management Website

This README outlines the steps to set up a development server for the Port Management System using Node.js, Express, and MySQL. It includes instructions for setting up MySQL, creating the necessary database and tables, and configuring the Node.js application to connect to MySQL.

## Prerequisites

- [Git](https://git-scm.com/downloads)

- [Node.js](https://nodejs.org/en/download) and npm installed.

- MySQL Server installed and running.

## Step 1: Setting Up MySQL

1. Install MySQL: Download and install MySQL from the [official website](https://dev.mysql.com/downloads/installer/).

2. Create Database and Tables:

    - Open the MySQL command line client and log in with your credentials.

    - Run the following commands to create your database and tables:

        ```
        CREATE DATABASE port_management;
        USE port_management;

        -- Ships Table
        CREATE TABLE Ships (
            shipID INT AUTO_INCREMENT PRIMARY KEY,
            shipName VARCHAR(255),
            shipSize INT,
            berthID INT,
            enteredPort TIMESTAMP,
            exitedPort TIMESTAMP
        );

        -- Berths Table
        CREATE TABLE Berths (
            berthID INT AUTO_INCREMENT PRIMARY KEY,
            berthName VARCHAR(255),
            shipID INT,
            isOccupied BOOLEAN DEFAULT FALSE
        );

        -- Containers Table
        CREATE TABLE Containers (
            containerID INT AUTO_INCREMENT PRIMARY KEY,
            sourceID VARCHAR(255),
            destinationID VARCHAR(255),
            sourceType VARCHAR(255),
            destinationType VARCHAR(255),
            storageAreaAddress VARCHAR(255)
        );

        -- Storage Area Table
        CREATE TABLE StorageArea (
            storageAddress VARCHAR(255) PRIMARY KEY,
            containerID INT
        );

        -- Cranes Table
        CREATE TABLE Cranes (
            craneID INT AUTO_INCREMENT PRIMARY KEY,
            isBusy BOOLEAN DEFAULT FALSE
        );

        -- Trucks Table
        CREATE TABLE Trucks (
            truckID INT AUTO_INCREMENT PRIMARY KEY,
            truckName VARCHAR(255),
            enteredPort TIMESTAMP
        );
        ```

3. Seed initial data:

    ```
    INSERT INTO Berths (berthName, shipID, isOccupied) VALUES 
    ('Berth 1', NULL, 0),
    ('Berth 2', NULL, 0),
    ('Berth 3', NULL, 0),
    ('Berth 4', NULL, 0),
    ('Berth 5', NULL, 0);

    INSERT INTO StorageArea (storageAddress, containerID) VALUES 
    ('Row A', NULL),
    ('Row B', NULL),
    ('Row C', NULL),
    ('Row D', NULL),
    ('Row E', NULL);
    ```

## Step 2: Setting Up Your Node.js Application

1. Clone Repository:

    ```
    git clone https://github.com/grayson40/port-management.git
    cd port-management
    git checkout master
    ```

2. Install Dependencies:

    ```
    cd server
    npm install
    ```

3. Set Up Express and MySQL Connection:

    - Edit app.js to set up your server and database connection:

        ```
        // MySQL connection setup
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'your_username',
            password: 'your_password',
            database: 'port_management'
        });
        ```

        Replace 'your_username' and 'your_password' with your MySQL username and password.

## Step 3: Running the Server
Run your server using the following command:

```
node app.js
```

### Troubleshooting

If you receive the error message: 

`'Client does not support authentication protocol requested by server; consider upgrading MySQL client'`

- Quit the server with `Ctrl+C`.

- Execute the following in your MySQL command line client:

    ```
    ALTER USER 'your_username'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
    FLUSH PRIVILEGES;
    ```

- Restart the server with:

    ```
    node app.js
    ```
