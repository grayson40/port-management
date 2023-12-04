# Port Management Website

This README outlines the steps to set up a development server for the Port Management System using Node.js, Express, and MySQL. It includes instructions for setting up MySQL, creating the necessary database and tables, and configuring the Node.js application to connect to MySQL.

## Prerequisites

- Node.js and npm (Node Package Manager) installed.

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
            enteredPort TIMESTAMP
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

## Step 2: Setting Up Your Node.js Application

1. Install Dependencies:

    ```
    npm install
    ```

2. Set Up Express and MySQL Connection:

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
cd server
node app.js
```