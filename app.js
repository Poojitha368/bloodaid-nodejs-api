const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

// Database connection setup
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

// // CORS and request middleware
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   res.header("Access-Control-Allow-Credentials", "true");
//   if (req.method === "OPTIONS") {
//     return res.status(200).end();
//   }
//   next();
// });

// Register
app.post("/register", (req, res) => {
  const {username,password,email,phone_number,bloodgroup,DOB,address,city,state,pincode} = req.body;
  const query = `INSERT INTO user (username, password, email, phone_number, blood_group, dob, address, city, state, pin_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    query,[username,password,email,phone_number,bloodgroup,DOB,address,city,state,pincode],
    (err) => {
      if (err) {
        console.error("Error inserting into database:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json(req.body);
      
    }
  );
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT user_id, username, password, role_id FROM user WHERE username = ? AND password = ?`;

  db.query(query, [username, password], (err, result) => {
    if (err) {
      console.error("Error querying the database:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length) {
      const user = result[0];
      res.json({
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id,
      });
    } else {
      res.status(404).json({ message: "User does not exist" });
    }
  });
});

// Donor Form Submission
app.post("/donor_form/:user_id", (req, res) => {
  const { user_id } = req.params;
  const { units, disease, donated_date } = req.body;
  const query = `INSERT INTO donation (user_id, units, disease, donated_date) VALUES (?, ?, ?, ?)`;

  db.query(query, [user_id, units, disease, donated_date], (err) => {
    if (err) {
      console.error("Error inserting into database:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(req.body);
  });
});

// patient Form Submission
app.post("/patient_form/:user_id", (req, res) => {
    const { user_id } = req.params;
    const { units, reason, requested_date } = req.body;
    const query = `INSERT INTO patient_request (user_id, units, reason, requested_date) VALUES (?, ?, ?, ?)`;
  
    db.query(query, [user_id, units, reason, requested_date], (err) => {
      if (err) {
        console.error("Error inserting into database:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json(req.body);
    });
  });

// View Donation Requests
app.get("/view_donations/:user_id", (req, res) => {
    const userId = req.params.user_id;

    const query = `SELECT donation_id, units, disease, donated_date, status, user_id
                   FROM donation
                   WHERE user_id = ?`;

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error("Error querying database:", err);
            return res.status(500).json({ message: "Database error" });
        }
        console.log(result);
        const view_donations = result.map((donation) => ({
            donation_id: donation.donation_id,
            units: donation.units,
            disease: donation.disease,
            donated_date: donation.donated_date,
            status: donation.status,
            user_id: donation.user_id
        }));

        res.json({ donations: view_donations });
    });
});


// View Patient Requests
app.get("/view_requests/:user_id", (req, res) => {
    const userId = req.params.user_id;

    const query = `SELECT request_id, units, reason, requested_date, status, user_id
                   FROM patient_request
                   WHERE user_id = ?`;

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error("Error querying database:", err);
            return res.status(500).json({ message: "Database error" });
        }
        console.log(result);
        const view_requests = result.map((request) => ({
            request_id: request.request_id,
            units: request.units,
            reason: request.reason,
            requested_date: request.requested_date,
            status: request.status,
            user_id: request.user_id
        }));

        res.json({ viewrequests: view_requests });
    });
});

// Fetch Blood Stock
app.get("/blood_stock", (req, res) => {
   
    const query = "SELECT bloodgroup, units FROM blood_stock";

    db.query(query, (err, result) => {
        if (err) {
            console.error("Error querying database:", err);
            return res.status(500).json({ message: "Database error" });
        }

        // Convert the result to a dictionary-like object for JSON response
        const bloodStockDict = {};
        result.forEach(row => {
            bloodStockDict[row.bloodgroup] = row.units;
        });

        res.json(bloodStockDict);
    });
});

// Fetch Donor History
app.get("/donor_history", (req, res) => {
    const query = `SELECT donation_id, blood_group, units, disease, donated_date, status 
        FROM user 
        JOIN donation ON user.user_id = donation.user_id   `;

    db.query(query, (err, result) => {
        if (err) {
            console.error("Error querying database:", err);
            return res.status(500).json({ message: "Database error" });
        }

        // If no donor history is found, return 404
        if (result.length === 0) {
            return res.status(404).json({ message: "No donation history found for this user" });
        }

        // Convert the result to a list of objects for JSON response
        const donorHistoryList = result.map(row => ({
            donation_id: row.donation_id,
            blood_group: row.blood_group,
            units: row.units,
            disease: row.disease,
            donated_date: row.donated_date,
            status: row.status
        }));

        // Return the donor history data as a JSON response
        res.json({ donorhistory: donorHistoryList });
    });
});

// Fetch Patient History
app.get("/patient_history", (req, res) => {
    const query = `
        SELECT username, blood_group, units, reason, requested_date, status, request_id
        FROM user 
        JOIN patient_request ON user.user_id = patient_request.user_id
    `;

    db.query(query, (err, result) => {
        if (err) {
            console.error("Error querying database:", err);
            return res.status(500).json({ message: "Database error" });
        }

        // Convert the result to a list of objects for JSON response
        const patientHistoryList = result.map(row => ({
            username: row.username,
            blood_group: row.blood_group,
            units: row.units,
            reason: row.reason,
            requested_date: row.requested_date,
            status: row.status,
            request_id: row.request_id
        }));

        // Return the patient history data as a JSON response
        res.json({ patienthistory: patientHistoryList });
    });
});



// Fetch Donation Requests
app.get("/donation_requests", (req, res) => {
    const query = `SELECT donation_id, username, blood_group, units, disease, donated_date, phone_number, status
                     FROM user JOIN donation ON user.user_id = donation.user_id`;
  
    db.query(query, (err, result) => {
      if (err) {
        console.error("Error querying database:", err);
        return res.status(500).json({ message: "Database error" });
      }
      const donationRequests = result.map((req) => ({
        donation_id: req.donation_id,
        username: req.username,
        blood_group: req.blood_group,
        units: req.units,
        disease: req.disease,
        donated_date: req.donated_date,
        phone_number: req.phone_number,
        status: req.status,
      }));
      res.json({ donationrequests: donationRequests });
    });
  });

// Fetch patient Requests
app.get("/patient_requests", (req, res) => {
    const query = `SELECT request_id, username, blood_group, units, reason, requested_date, phone_number, status
                     FROM user JOIN patient_request ON user.user_id = patient_request.user_id`;
  
    db.query(query, (err, result) => {
      if (err) {
        console.error("Error querying database:", err);
        return res.status(500).json({ message: "Database error" });
      }
      const patientRequests = result.map((req) => ({
        request_id: req.request_id,
        username: req.username,
        blood_group: req.blood_group,
        units: req.units,
        disease: req.reason,
        requested_date: req.requested_date,
        phone_number: req.phone_number,
        status: req.status,
      }));
      res.json({ patientrequests: patientRequests });
    });
  });

// Update Donation Request
app.put("/update_donation_request/:donation_id", (req, res) => {
    const donationId = req.params.donation_id;
    const status = req.body.status;

    const updateDonationQuery = "UPDATE donation SET status = ? WHERE donation_id = ?";
    db.query(updateDonationQuery, [status, donationId], (err, result) => {
        if (err) {
            console.error("Error updating donation request:", err);
            return res.status(500).json({ message: "Database error" });
        }

        const fetchDonorQuery = `
            SELECT donation.units, user.blood_group
            FROM donation
            INNER JOIN user ON user.user_id = donation.user_id
            WHERE donation.donation_id = ?
        `;

        db.query(fetchDonorQuery, [donationId], (err, donor) => {
            if (err) {
                console.error("Error fetching donor details:", err);
                return res.status(500).json({ message: "Database error" });
            }

            if (donor.length > 0) {
                const units = donor[0].units;
                const bloodGroup = donor[0].blood_group;

                const updateBloodStockQuery = "UPDATE blood_stock SET units = units + ? WHERE bloodgroup = ?";
                db.query(updateBloodStockQuery, [units, bloodGroup], (err) => {
                    if (err) {
                        console.error("Error updating blood stock:", err);
                        return res.status(500).json({ message: "Database error" });
                    }

                    return res.json({ message: "Donation request updated!" });
                });
            } else {
                return res.status(404).json({ message: "Donation request not found!" });
            }
        });
    });
});

// Update Patient Request
app.put("/update_patient_request/:request_id", (req, res) => {
    const requestId = req.params.request_id;
    const status = req.body.status;

    const updateRequestQuery = "UPDATE patient_request SET status = ? WHERE request_id = ?";
    db.query(updateRequestQuery, [status, requestId], (err) => {
        if (err) {
            console.error("Error updating patient request:", err);
            return res.status(500).json({ message: "Database error" });
        }

        const fetchDonorQuery = `
            SELECT patient_request.units, user.blood_group
            FROM patient_request
            INNER JOIN user ON user.user_id = patient_request.user_id
            WHERE patient_request.request_id = ?
        `;

        db.query(fetchDonorQuery, [requestId], (err, donor) => {
            if (err) {
                console.error("Error fetching donor details:", err);
                return res.status(500).json({ message: "Database error" });
            }

            if (donor.length > 0) {
                const units = donor[0].units;
                const bloodGroup = donor[0].blood_group;

                const updateBloodStockQuery = "UPDATE blood_stock SET units = units - ? WHERE bloodgroup = ?";
                db.query(updateBloodStockQuery, [units, bloodGroup], (err) => {
                    if (err) {
                        console.error("Error updating blood stock:", err);
                        return res.status(500).json({ message: "Database error" });
                    }

                    return res.json({ message: "Patient request updated!" });
                });
            } else {
                return res.status(404).json({ message: "Patient request not found!" });
            }
        });
    });
});



  
// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
