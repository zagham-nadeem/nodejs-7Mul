const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
app.use(bodyParser.json());
app.use("./uploads", express.static("uploads"));
app.use(cors());
const multer = require("multer");

dotenv.config();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, `${file.originalname}`);
  },
});

const upload = multer({ storage });

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port:process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
});
// const connection = mysql.createConnection({
//   host: "srv942.hstgr.io",
//   user: "u862213408_agentdiary",
//   password: "159963asdf@G",
//   database: "u862213408_agentdiary",
// });

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// API endpoint to get messages between two users
//! XXXXXXXXXXX Upload Single Images Api XXXXXXXXXx
// app.post("/file", upload.single("file"), (req, res) => {
//   const file = req.file;

//   if (file) {
//     res.json(file);
//   } else {
//     throw new Error("File upload unsuccessful");
//   }
// });

//! XXXXXXXXXXXX  Upload images api   XXXXXXXXXX
app.post("/addproperty", upload.array("files"), (req, res) => {
  const { propertydata } = req.body;
  const data = JSON.parse(propertydata);
  const {
    type,
    twon_house,
    building,
    unit,
    owner_name,
    owner_mobile_number,
    owner_nationality,
    start_date,
    end_date,
    checks,
    status,
  } = data;

  const files = req.files;
  console.log(files);
  const sql = `INSERT INTO property (type, twon_house, building, unit, status ) VALUES (?,?,?,?,?)`;
  connection.query(sql, [type, twon_house, building, unit, status], (err) => {
    if (err) {
      console.error("Error retrieving messages:", err);
    }
    if (status === "Rent") {
      const sql =
        "SELECT p_id FROM property WHERE p_id = (SELECT MAX(p_id) FROM property)";
      connection.query(sql, (err, result) => {
        if (err) throw err;
        else {
          const { p_id } = result[0];
          const sql2 =
            "INSERT INTO owner (p_id,owner_name,owner_nationality,owner_mobile_number) VALUES (?,?,?,?)";
          connection.query(
            sql2,
            [p_id, owner_name, owner_nationality, owner_mobile_number],
            (err, result) => {
              if (err) throw err;
              if (Array.isArray(checks) && checks.length > 0) {
                const clen = checks?.length;

                for (i = 0; i < clen; i++) {
                  const check_val = checks[i]?.check_no;
                  const sql4 =
                    "INSERT INTO `rent_detail`(`p_id`, `start_date`, `end_date`, `total_checks`) VALUES (?,?,?,?)";
                  connection.query(
                    sql4,
                    [p_id, start_date, end_date, check_val],
                    (err) => {
                      if (err) throw err;
                    }
                  );
                }

                if (Array.isArray(files) && files.length > 0) {
                  const len = files?.length;
                  for (i = 0; i < len; i++) {
                    const name = files[i]?.originalname;
                    const sql3 =
                      "INSERT INTO `property_document`(`p_id`, `file`) VALUES (?,?)";
                    connection.query(sql3, [p_id, name], (err) => {
                      if (err) throw err;
                      res.send("success");
                    });
                  }
                  res.send("success");
                } else {
                  console.log(err);
                }
              }
            }
          );
        }
      });
    } else {
      const sql =
        "SELECT p_id FROM property WHERE p_id = (SELECT MAX(p_id) FROM property)";
      connection.query(sql, (err, result) => {
        const { p_id } = result[0];
        if (err) throw err;
        const sql2 =
          "INSERT INTO owner (p_id,owner_name,owner_nationality,owner_mobile_number) VALUES (?,?,?,?)";
        connection.query(
          sql2,
          [p_id, owner_name, owner_nationality, owner_mobile_number],
          (err, result) => {
            if (err) throw err;
            else if (Array.isArray(files) && files.length > 0) {
              const len = files?.length;
              for (i = 0; i < len; i++) {
                const name = files[i]?.originalname;
                const sql3 =
                  "INSERT INTO `property_document`(`p_id`, `file`) VALUES (?,?)";
                connection.query(sql3, [p_id, name], (err) => {
                  if (err) throw err;
                });
              }
              res.send("success");
            }
          }
        );
      });
    }
  });
});

app.get("/seeproperty", (req, res) => {
  const sql = "SELECT * FROM property";
  connection.query(sql, (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});

// ! XXXXXXXXXXXXXXX   Delete Property   XXXXXXXX

app.delete("/deleteproperty/:id", (req, res) => {
  const { id } = req.params;
  connection.query("DELETE FROM property WHERE p_id = ? ", id, (err) => {
    if (err) throw err;
    connection.query("DELETE FROM owner WHERE p_id = ? ", id, (err) => {
      if (err) throw err;
      connection.query(
        "DELETE FROM property_document WHERE p_id = ? ",
        id,
        (err) => {
          if (err) throw err;
          connection.query(
            "DELETE FROM rent_detail WHERE p_id = ? ",
            id,
            (err, result) => {
              if (err) {
                res.status(422).json("error");
              } else {
                res.status(201).json(result);
              }
            }
          );
        }
      );
    });
  });
});

//! XXXXXXXXXXXXXXXXXXXXX Get one Property Record XXXXXXXXXXXXXXXXXXXXX
app.get("/property/:id", (req, res) => {
  const { id } = req.params;

  const sql =
    "SELECT * FROM property p JOIN owner own ON p.p_id = own.p_id LEFT JOIN rent_detail rd ON p.p_id = rd.p_id AND p.status = 'rent' WHERE p.p_id = ?";
  connection.query(sql, id, (err, results) => {
    if (err) throw err;
    const sql1 = "SELECT total_checks FROM `rent_detail` WHERE p_id = ?";
    connection.query(sql1, id, (err, resl) => {
      if (err) throw err;
      const test = JSON.stringify(resl);
      const final = JSON.parse(test);
      // Check if "checks" field exists
      if (final.length > 0) {
        const sql2 = "SELECT file FROM `property_document` WHERE p_id = ?";
        connection.query(sql2, id, (err, resu) => {
          if (err) throw err;
          const test1 = JSON.stringify(resu);
          const final1 = JSON.parse(test1);
          const main1 = results[0];
          main1.checks = final;
          main1.owner_document = final1;
          main1.pro_id = id;
          const finalres = [];
          finalres.push(main1);
          res.send(finalres);
        });
      } else {
        const sql2 = "SELECT file FROM `property_document` WHERE p_id = ?";
        connection.query(sql2, id, (err, resu) => {
          if (err) throw err;
          const test2 = JSON.stringify(resu);
          const final2 = JSON.parse(test2);
          const main = results[0];
          main.owner_document = final2;
          main.pro_id = id;
          const finalres = [];
          finalres.push(main);
          res.send(finalres);
        });
      }
    });
  });
});

app.get("/api/check-messages", (req, res) => {
  const { receiverId } = req.query;
  const query = `
      SELECT DISTINCT sender FROM messages
      WHERE receiver = ${receiverId}
    `;
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Error checking messages:", error);
      res.status(500).json({ error: "Failed to check messages" });
    } else {
      const senders = results.map((result) => result.sender);
      res.json(senders);
    }
  });
});

//! XXXXXXXXXXXXXXXXX    Update Record   XXXXXXX

app.put("/updates", (req, res) => {
  const {
    type,
    twon_house,
    building,
    unit,
    status,
    start_date,
    end_date,
    owner_name,
    owner_mobile_number,
    owner_nationality,

    checks,
    pro_id,
  } = req.body;

  const sql =
    "UPDATE `property` SET `type`=?,`twon_house`=?,`building`=?,`unit`=?,`status`=? WHERE p_id = ?";

  connection.query(
    sql,
    [type, twon_house, building, unit, status, pro_id],
    (err, result) => {
      if (err) throw err;
      const sql1 =
        "UPDATE `owner` SET  `owner_name`=?,`owner_nationality`=?,`owner_mobile_number`=? WHERE p_id =?";
      connection.query(
        sql1,
        [owner_name, owner_nationality, owner_mobile_number, pro_id],
        (err, result1) => {
          if (err) throw err;
          if (status === "Rent") {
            for (let i = 0; i < checks.length; i++) {
              const sql32 =
                "UPDATE `rent_detail` SET `start_date`=?,`end_date`=?,`total_checks`=? WHERE p_id = ?";
              connection.query(
                sql32,
                [start_date, end_date, checks[i], pro_id],
                (err, result3) => {
                  if (err) throw err;
                }
              );
            }
          }
          // console.log(result1)

          res.send({ res: "done" });
        }
      );
    }
  );
});

// ! XXXXXXXXXXX    get Api Owner   XXXXXXXXXX

app.get("/owner", (req, res) => {
  const sql = "SELECT * FROM `owner` ";
  connection.query(sql, (err, result) => {
    if (err) {
      res.status(500).json({ error: "Failed to check messages" });
    } else {
      res.json(result);
    }
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  // Query the MySQL database to check if the username and password match a user
  const query = `SELECT * FROM users WHERE u_name = ? AND u_password = ?`;

  connection.query(query, [username, password], (err, results) => {
    if (err) {
      console.error("Error executing MySQL query:", err);
      res.status(500).json({ message: "Server error" });
    } else {
      console.log(results)
      if (results.length > 0) {
        // Successful login
        res.json(results);
      } else {
        // Invalid credentials
        res.status(401).json({ message: "Invalid credentials" });
      }
    }
  });
});

//! Start the server
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
