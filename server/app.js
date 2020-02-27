const exec = require("child_process").execFile;
const sql = require("mssql");
const request = require("request");
const express = require("express");

const app = express();
const cors = require("cors");
app.use(cors());
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const serverPort = 2500;

// Define database connection settings.
const configMdt2010 = {
  user: "mdtdatacollector",
  password: "password",
  server: "localhost\\ADK",
  database: "MDT2010"
};

// Connect to the database with the settings defined above.
sql.connect(configMdt2010);

// Variable for keeping track of computer reboot information. This could be saved to a file to make the storage persistant.
const rebootInfo = [];

// Variable for storing schedules. This could be saved to a file to make the storage persistant.
const schedules = [];

// A loop that runs every 5 sec. This loop handle schedules.
setInterval(async () => {
  // Filter out relevant schedules (ones that should be triggered).
  const filteredSchedules = schedules.filter(
    x => !x.done && new Date() > new Date(x.start)
  );

  // Loop through the schedules and take action.
  for (const schedule of filteredSchedules) {
    try {
      // Make sure that the schedule is set as "done", so that it is not triggered again.
      schedule.done = true;

      console.log(
        "running schedule:",
        schedule.computer,
        new Date(schedule.start),
        schedule.roleName
      );

      // Running a bunch of SQL queries to "assign" a computer in MDT.
      await assignComputer(
        schedule.computer,
        schedule.computerId,
        schedule.classroomNumber,
        schedule.roleName
      );

      // Initiating a remote reboot based on the computer name. We do not wait for the function to complete, because it is a long running task.
      rebootComputer(schedule.computer);
    } catch (err) {
      console.error(err);
    }
  }
}, 5000);

// An SQL query middleware to return only relevant information from SQL queries.
async function sqlQuery(query) {
  const result = await sql.query(query);
  return result.recordsets[0];
}

// Route that returns an array with cities in MDT, based on computer names.
app.get("/cities/", async (req, res) => {
  const result = await sqlQuery(
    `SELECT substring(Description,0,4) AS City FROM [MDT2010].[dbo].[ComputerIdentity] GROUP BY substring(Description,0,4)`
  );
  res.json(result);
});

// Route that returns an array with rooms in a specific city, based on computer names.
app.get("/cities/:city/rooms", async (req, res) => {
  const result = await sqlQuery(
    `SELECT substring(Description,0,4) AS City, substring(Description,5,3) AS Room  FROM [MDT2010].[dbo].[ComputerIdentity] WHERE Description LIKE '${req.params.city}%' GROUP BY substring(Description,0,4), substring(Description,5,3)`
  );
  res.json(result);
});

// Route that returns an array with computers in a specific city and in a specific room, based on computer names.
app.get("/cities/:city/rooms/:room/computers", async (req, res) => {
  const result = await sqlQuery(
    `SELECT * FROM ComputerIdentity INNER JOIN Settings_Roles ON ComputerIdentity.ID=Settings_Roles.ID WHERE ComputerIdentity.Description LIKE '${req.params.city}-${req.params.room}%' AND (Settings_Roles.Role NOT LIKE '%Teacher' AND Settings_Roles.Role NOT LIKE '%Applications') ORDER BY Description ASC`
  );
  res.json(result);
});

// Route that returns an array with progress data in a specific city and in a specific room.
app.get("/cities/:city/rooms/:room/computers/progress/", async (req, res) => {
  const computers = await getMonitoringData();

  // The information we get back from the function above has to be filtered to match the room and city (computer names contains city and room).
  const filtered = computers.filter(x =>
    x.Name.startsWith(`${req.params.city}-${req.params.room}`)
  );
  res.json(filtered);
});

// Route that returns an array with schedules in a specific city and in a specific room.
app.get("/cities/:city/rooms/:room/computers/schedules/", async (req, res) => {
  const filtered = schedules.filter(x =>
    x.computer.startsWith(`${req.params.city}-${req.params.room}`)
  );
  res.json(filtered);
});

// Route that returns an array with all computers in MDT.
app.get("/computers", async (req, res) => {
  const result = await sqlQuery(
    `SELECT * FROM ComputerIdentity INNER JOIN Settings_Roles ON ComputerIdentity.ID=Settings_Roles.ID ORDER BY Description ASC`
  );
  res.json(result);
});

// Route that returns an array with all MDT roles.
app.get("/roles", async (req, res) => {
  const result = await sqlQuery(
    `SELECT * FROM RoleIdentity WHERE Role NOT LIKE '%Teacher' AND Role NOT LIKE '%Applications' ORDER BY Role ASC`
  );
  res.json(result);
});

// Route that returns an array with computers reboot information in a specific city and a specific room.
app.get(
  "/cities/:city/rooms/:room/computers/rebootprogress/",
  async (req, res) => {
    res.json(
      rebootInfo.filter(x =>
        x.computer.startsWith(`${req.params.city}-${req.params.room}`)
      )
    );
  }
);

// Route that trigger MDT deployment for a specific computer.
app.post("/deploy/computer", async (req, res) => {
  if (req.body) {
    // Get the relevant posted data.
    const data = req.body;

    // Find the computer in MDT SQL instance.
    const computers = await sqlQuery(
      `SELECT * FROM ComputerIdentity WHERE Description = '${data.target}'`
    );

    // The result is still an array, so loop through the array, even if the result SHOULD return only one computer in the array.
    for (const computer of computers) {
      // Reboot the computer based on the "Description" field, which should be the computer name.
      rebootComputer(computer.Description);
    }

    // Return nothing, apperently.
    res.json([]);
  }
});

// Route that trigger MDT deployment for all computers in a specific room.
app.post("/deploy/room", async (req, res) => {
  if (req.body) {
    const data = req.body;

    // Find the computers in MDT SQL instance.
    const computers = await sqlQuery(
      `SELECT * FROM ComputerIdentity WHERE Description LIKE '${data.city}-${data.target}%'`
    );

    for (const computer of computers) {
      rebootComputer(computer.Description);
    }

    res.json([]);
  }
});

// A helper function to update or add relevant reboot information to the "rebootInfo" variable.
function updateRebootInfo(arr) {
  for (let newInfo of arr) {
    const existing = rebootInfo.find(x => x.computer === newInfo.computer);
    if (existing) {
      existing.deployResult = newInfo.deployResult;
    } else {
      rebootInfo.push(newInfo);
    }
  }
}

// Route that removes deployment schedules for specific room.
app.post("/schedule/delete/room", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await sqlQuery(
      `SELECT * FROM ComputerIdentity WHERE Description LIKE '${data.city}-${data.target}%'`
    );

    // Each computer has an induvidual schedule that has to be removed.
    for (const computer of computers) {
      deleteSchedule(computer.Description);
    }

    res.json({});
  }
});

// Route that removes deployment schedule for specific computer.
app.post("/schedule/delete/computer", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await sqlQuery(
      `SELECT * FROM ComputerIdentity WHERE Description = '${data.target}'`
    );

    for (const computer of computers) {
      deleteSchedule(computer.Description);
    }

    res.json({});
  }
});

// Route that adds deployment schedule for all computers in a specific room.
app.post("/schedule/set/room", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await sqlQuery(
      `SELECT * FROM ComputerIdentity WHERE Description LIKE '${data.city}-${data.target}%'`
    );

    const newSchedules = [];

    for (const computer of computers) {
      // setSchedule adds or updates the schedule information for a specific computer, and returns relevant a schedule object.
      newSchedules.push(
        setSchedule(
          computer.Description,
          computer.ID,
          data.room,
          data.role,
          data.start
        )
      );
    }

    // Return the schedule information to the client.
    res.json(newSchedules);
  }
});

// Same as above but for a specific computer.
app.post("/schedule/set/computer", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await sqlQuery(
      `SELECT * FROM ComputerIdentity WHERE Description = '${data.target}'`
    );
    const toReturn = [];

    for (const computer of computers) {
      toReturn.push(
        setSchedule(
          computer.Description,
          computer.ID,
          data.room,
          data.role,
          data.start
        )
      );
    }

    res.json(toReturn);
  }
});

// Route to assign an MDT role to a specific computer.
app.post("/assign/computer", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await sqlQuery(
      `SELECT * FROM ComputerIdentity WHERE Description = '${data.target}'`
    );

    for (const computer of computers) {
      await assignComputer(
        computer.Description,
        computer.ID,
        data.room,
        data.role
      );
    }

    res.json({});
  }
});

// Route to assign an MDT role to computers in a specific room.
app.post("/assign/room", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await sqlQuery(
      `SELECT * FROM ComputerIdentity WHERE Description LIKE '${data.city}-${data.target}%'`
    );

    for (const computer of computers) {
      await assignComputer(
        computer.Description,
        computer.ID,
        data.target,
        data.role
      );
    }

    res.json({});
  }
});

// Function to remote reboot a computer into deployment mode.
function rebootComputer(computerName) {
  // Wrapped in a promise due to the time it takes to execute the reboot command. Must be able init reboot on multiple computers at the same time.
  return new Promise(async (resolve, reject) => {
    const newRebootInfo = {
      computer: computerName,
      deployResult: { success: null, running: true }
    };

    // Add/update the reboot info, so that the client can ask for current status.
    updateRebootInfo([newRebootInfo]);

    try {
      // Run the reboot command with the help of PsExec.
      const result = await runPsexecCommand(
        computerName,
        "cscript.exe /nologo c:\\temp\\setboot.vbs /accepteula"
      );

      // Add relevant information about the result.
      newRebootInfo.deployResult.started = new Date();
      newRebootInfo.deployResult.success = true;
      newRebootInfo.deployResult.running = false;
      newRebootInfo.deployResult.data = result;
    } catch (err) {
      // The remote reboot failed. Add relevant information.
      newRebootInfo.deployResult.success = false;
      newRebootInfo.deployResult.running = false;
      newRebootInfo.deployResult.err = err;
    }

    // Update the reboot info once again.
    updateRebootInfo([newRebootInfo]);
  });
}

// Function to execute PsExec commands.
function runPsexecCommand(computerName, command) {
  // "exec" is not async/await compliant, so we wrap the function into promise to make it so.
  return new Promise((resolve, reject) => {
    command =
      "\\\\" + computerName + " -u administrator -p password -s " + command;
    exec("PsExec.exe", command.split(" "), (err, data) => {
      if (!err) {
        resolve(data);
      } else {
        reject(err);
      }
    });
  });
}

// Function to assign a MDT role to a computer.
async function assignComputer(
  computerName,
  computerId,
  classroomNumber,
  roleName
) {
  await sqlQuery(`DELETE FROM Settings WHERE ID=${computerId} AND Type='C'`);
  await sqlQuery(
    `INSERT INTO Settings (Type,ID,ComputerName,OSDComputerName,OrgName,FullName,JoinWorkgroup) VALUES ('C',${computerId},'${computerName} ','${computerName}','Windows User','Windows User','${classroomNumber}')`
  );
  await sqlQuery(`DELETE FROM Settings_Roles WHERE ID=${computerId}`);
  await sqlQuery(
    `INSERT INTO Settings_Roles (Type,ID,Sequence,Role) VALUES ('C',${computerId},1,'Basic Applications')`
  );
  await sqlQuery(
    `INSERT INTO Settings_Roles (Type,ID,Sequence,Role) VALUES ('C',${computerId},2,'${roleName}')`
  );

  // If the computer is the teachers computer, then add teacher applications.
  if (computerName.toLowerCase().includes("teacher")) {
    await sqlQuery(
      `INSERT INTO Settings_Roles (Type,ID,Sequence,Role) VALUES ('C',${computerId},3,'Teacher Applications')`
    );
    await sqlQuery(
      `INSERT INTO Settings_Roles (Type,ID,Sequence,Role) VALUES ('C',${computerId},4,'${roleName}-Teacher')`
    );
  }
}

// Function to get deployment status from MDT monitor endpoint.
function getMonitoringData() {
  // request is not async/await compliant, so we wrap the function in a promise to make it so.
  return new Promise((resolve, reject) => {
    request.get(
      "http://localhost:9801/MDTMonitorData/Computers",
      { json: true },
      (err, res, data) => {
        if (!err) {
          resolve(data.d);
        } else {
          reject(err);
        }
      }
    );
  });
}

// Function to add/update a computer schedule in "schedules" variable.
function setSchedule(
  computerName,
  computerId,
  classroomNumber,
  roleName,
  start
) {
  // Find existing schedule.
  const currentSchedule = schedules.find(x => x.computer === computerName);

  if (!currentSchedule) {
    // If it was not found, so we add it.
    const newSchedule = {
      computer: computerName,
      computerId,
      classroomNumber,
      roleName,
      start
    };
    schedules.push(newSchedule);

    console.log(
      "setting schedule",
      newSchedule.computer,
      new Date(newSchedule.start),
      newSchedule.roleName
    );
    return newSchedule;
  } else {
    // The schedule was found and is now updated.

    currentSchedule.computerId = computerId;
    currentSchedule.classroomNumber = classroomNumber;
    currentSchedule.roleName = roleName;
    currentSchedule.start = start;
    currentSchedule.done = false;

    console.log(
      "setting schedule",
      currentSchedule.computer,
      new Date(currentSchedule.start),
      currentSchedule.roleName
    );

    return currentSchedule;
  }
}

// Function to remove a schedule from the "schedules" variable.
function deleteSchedule(computerName) {
  // First find it.
  const currentSchedule = schedules.find(x => x.computer === computerName);

  if (currentSchedule) {
    // Was found, now remove it.
    const index = schedules.indexOf(currentSchedule);
    schedules.splice(index, 1);

    console.log("Deleted schedule");
  }
}

// Function to get a schedule from "schedules" variable.
function GetSchedule(computerName) {
  return schedules.find(x => x.computer === computerName);
}

// Start express server on defined port.
app.listen(serverPort, () => console.log(`Listening on port ${serverPort}.`));
