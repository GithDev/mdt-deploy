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

const port = 2500;

const configMdt2010 = {
  user: "mdtdatacollector",
  password: "password",
  server: "localhost\\ADK",
  database: "MDT2010"
};

const configMdtDataCollection = {
  user: "mdtdatacollector",
  password: "",
  server: "localhost\\ADK",
  database: "MDTDataCollection"
};

sql.connect(configMdt2010);

const rebootInfo = [];
const schedules = [];

setInterval(async () => {
  for (schedule of schedules.filter(
    x => !x.done && new Date() > new Date(x.start)
  )) {
    schedule.done = true;

    console.log(
      "running schedule:",
      schedule.computer,
      new Date(schedule.start),
      schedule.roleName
    );

    await assignComputer(
      schedule.computer,
      schedule.computerId,
      schedule.classroomNumber,
      schedule.roleName
    );

    rebootComputer(schedule.computer);
  }
}, 5000);

async function Query(query) {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await sql.query(query);
      resolve(result.recordsets[0]);
    } catch (err) {
      reject(err);
    }
  });
}

app.get("/cities/", async (req, res) => {
  const result = await Query(
    `SELECT substring(Description,0,4) AS City FROM [MDT2010].[dbo].[ComputerIdentity] GROUP BY substring(Description,0,4)`
  );
  res.json(result);
});

app.get("/cities/:city/rooms", async (req, res) => {
  const result = await Query(
    `SELECT substring(Description,0,4) AS City, substring(Description,5,3) AS Room  FROM [MDT2010].[dbo].[ComputerIdentity] WHERE Description LIKE '${req.params.city}%' GROUP BY substring(Description,0,4), substring(Description,5,3)`
  );
  res.json(result);
});

app.get("/cities/:city/rooms/:room/computers", async (req, res) => {
  const result = await Query(
    `SELECT * FROM ComputerIdentity INNER JOIN Settings_Roles ON ComputerIdentity.ID=Settings_Roles.ID WHERE ComputerIdentity.Description LIKE '${req.params.city}-${req.params.room}%' AND (Settings_Roles.Role NOT LIKE '%Teacher' AND Settings_Roles.Role NOT LIKE '%Applications') ORDER BY Description ASC`
  );
  res.json(result);
});

app.get("/cities/:city/rooms/:room/computers/progress/", async (req, res) => {
  const computers = await getMonitoringData();
  const filtered = computers.filter(x =>
    x.Name.startsWith(req.params.city + "-" + req.params.room)
  );
  res.json(filtered);
});

app.get("/cities/:city/rooms/:room/computers/schedules/", async (req, res) => {
  const filtered = schedules.filter(x =>
    x.computer.startsWith(req.params.city + "-" + req.params.room)
  );
  res.json(filtered);
});

app.get("/computers", async (req, res) => {
  const result = await Query(
    `SELECT * FROM ComputerIdentity INNER JOIN Settings_Roles ON ComputerIdentity.ID=Settings_Roles.ID ORDER BY Description ASC`
  );
  res.json(result);
});

app.get("/roles", async (req, res) => {
  try {
    const result = await Query(
      `SELECT * FROM RoleIdentity WHERE Role NOT LIKE '%Teacher' AND Role NOT LIKE '%Applications' ORDER BY Role ASC`
    );
    res.json(result);
  } catch (err) {
    console.log(err);
  }
});

app.get(
  "/cities/:city/rooms/:room/computers/rebootprogress/",
  async (req, res) => {
    res.json(
      rebootInfo.filter(x =>
        x.computer.startsWith(req.params.city + "-" + req.params.room)
      )
    );
  }
);

app.post("/deploy/computer", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await Query(
      `SELECT * FROM ComputerIdentity WHERE Description = '${data.target}'`
    );

    for (const computer of computers) {
      rebootComputer(computer.Description);
    }

    res.json([]);
  }
});

app.post("/deploy/room", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await Query(
      `SELECT * FROM ComputerIdentity WHERE Description LIKE '${data.city}-${data.target}%'`
    );

    for (const computer of computers) {
      rebootComputer(computer.Description);
    }

    res.json([]);
  }
});

function updateRebootInfo(arr) {
  return new Promise((resolve, reject) => {
    for (let newInfo of arr) {
      const existing = rebootInfo.find(x => x.computer === newInfo.computer);
      if (existing) {
        existing.deployResult = newInfo.deployResult;
      } else {
        rebootInfo.push(newInfo);
      }
    }

    resolve();
  });
}

app.post("/schedule/delete/room", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await Query(
      `SELECT * FROM ComputerIdentity WHERE Description LIKE '${data.city}-${data.target}%'`
    );

    for (const computer of computers) {
      deleteSchedule(computer.Description);
    }

    res.json({});
  }
});

app.post("/schedule/delete/computer", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await Query(
      `SELECT * FROM ComputerIdentity WHERE Description = '${data.target}'`
    );

    for (const computer of computers) {
      deleteSchedule(computer.Description);
    }

    res.json({});
  }
});

app.post("/schedule/set/room", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await Query(
      `SELECT * FROM ComputerIdentity WHERE Description LIKE '${data.city}-${data.target}%'`
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

app.post("/schedule/set/computer", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await Query(
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

app.post("/assign/computer", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await Query(
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

app.post("/assign/room", async (req, res) => {
  if (req.body) {
    const data = req.body;

    const computers = await Query(
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

function rebootComputer(computerName) {
  return new Promise(async (resolve, reject) => {
    let toReturn = {
      computer: computerName,
      deployResult: { success: null, running: true }
    };
    updateRebootInfo([toReturn]);

    try {
      const result = await runPsexecCommand(
        computerName,
        "cscript.exe /nologo c:\\temp\\setboot.vbs /accepteula"
      );

      toReturn.deployResult.started = new Date();
      toReturn.deployResult.success = true;
      toReturn.deployResult.running = false;
      toReturn.deployResult.data = result;
    } catch (err) {
      toReturn.deployResult.success = false;
      toReturn.deployResult.running = false;
      toReturn.deployResult.err = err;
    }

    updateRebootInfo([toReturn]);
  });
}

function runPsexecCommand(computerName, command) {
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

async function assignComputer(
  computerName,
  computerId,
  classroomNumber,
  roleName
) {
  await Query("DELETE FROM Settings WHERE ID=" + computerId + " AND Type='C'");
  await Query(
    `INSERT INTO Settings (Type,ID,ComputerName,OSDComputerName,OrgName,FullName,JoinWorkgroup) VALUES ('C',${computerId},'${computerName} ','${computerName}','Windows User','Windows User','${classroomNumber}')`
  );
  await Query(`DELETE FROM Settings_Roles WHERE ID=${computerId}`);
  await Query(
    `INSERT INTO Settings_Roles (Type,ID,Sequence,Role) VALUES ('C',${computerId},1,'Basic Applications')`
  );
  await Query(
    `INSERT INTO Settings_Roles (Type,ID,Sequence,Role) VALUES ('C',${computerId},2,'${roleName}')`
  );

  if (computerName.toLowerCase().includes("teacher")) {
    await Query(
      `INSERT INTO Settings_Roles (Type,ID,Sequence,Role) VALUES ('C',${computerId},3,'Teacher Applications')`
    );
    await Query(
      `INSERT INTO Settings_Roles (Type,ID,Sequence,Role) VALUES ('C',${computerId},4,'${roleName}-Teacher')`
    );
  }
}

function getMonitoringData() {
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

function setSchedule(
  computerName,
  computerId,
  classroomNumber,
  roleName,
  start
) {
  const currentSchedule = schedules.find(x => x.computer === computerName);

  if (!currentSchedule) {
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

function deleteSchedule(computerName) {
  const currentSchedule = schedules.find(x => x.computer === computerName);

  if (currentSchedule) {
    const index = schedules.indexOf(currentSchedule);
    schedules.splice(index, 1);

    console.log("Deleted schedule");
  }
}

function GetSchedule(computerName) {
  return schedules.find(x => x.computer === computerName);
}

app.listen(port, () => console.log("Listening on port " + port + "."));
