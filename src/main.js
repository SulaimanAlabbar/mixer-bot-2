const { app, BrowserWindow, ipcMain } = require("electron");
const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const fs = require("fs");
const path = require("path");
const { GameClient, setWebSocket } = require("@mixer/interactive-node");
const ws = require("ws");
const config = require("../config.json");

const logDir = "../logs";

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const filename = path.join(logDir, "results.log");

const dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: `${logDir}/%DATE%-results.log`,
  datePattern: "YYYY-MM-DD"
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [new transports.File({ filename }), dailyRotateFileTransport]
});

let players = [];
let gunButtonControls = [];
let gunLabelControls = [];
let killsButtonControls = [];
let killsLabelControls = [];
let rankingButtonControls = [];
let rankingLabelControls = [];
let entryFeeControls = [];
const defaultSceneId = "default";
let votingEnabled = true;

let win;

function createWindow() {
  win = new BrowserWindow({ width: 800, height: 700 });

  win.loadFile("./src/index.html");
  win.setResizable(false);
  win.setMenuBarVisibility(false);
  win.setTitle("InfiniteIQ");

  win.on("closed", () => {
    win = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (win === null) {
    createWindow();
  }
});

setWebSocket(ws);
const client = new GameClient();

client.on("open", async () => {
  //==================================================
  //================CREATINGCONTROLS==================
  //==================================================

  async function createControls() {
    let controls = await client.createControls({
      sceneID: defaultSceneId,
      controls: config.controls
    });

    controls.forEach(control => {
      if (control.controlID.includes("Gun_Button")) {
        gunButtonControls.push({
          control: control,
          votes: 0
        });
      } else if (control.controlID.includes("Gun_Label")) {
        gunLabelControls.push(control);
      } else if (control.controlID.includes("Kills_Button")) {
        killsButtonControls.push({
          control: control,
          votes: 0
        });
      } else if (control.controlID.includes("Kills_Label")) {
        killsLabelControls.push(control);
      } else if (control.controlID.includes("Ranking_Button")) {
        rankingButtonControls.push({
          control: control,
          votes: 0
        });
      } else if (control.controlID.includes("Ranking_Label")) {
        rankingLabelControls.push(control);
      } else if (control.controlID.includes("Entry_Fee")) {
        entryFeeControls.push(control);
      }
    });

    //==================================================
    //=====================ENTRYFEE=====================
    //==================================================

    entryFeeControls.forEach(efc => {
      efc.on("mousedown", async (inputEvent, participant) => {
        if (!votingEnabled) return;

        const indexOfPlayer = players.findIndex(
          player => player.username === participant.username
        );

        if (!players[indexOfPlayer].entryFee) {
          players[indexOfPlayer].entryFee = true;

          if (inputEvent.transactionID)
            await client.captureTransaction(inputEvent.transactionID);
        }
      });
    });

    //==================================================
    //=====================GUNBUTTONS===================
    //==================================================
    gunButtonControls.forEach(gbc => {
      gbc.control.on("mousedown", async (inputEvent, participant) => {
        if (!votingEnabled) return;

        const indexOfPlayer = players.findIndex(
          player => player.username === participant.username
        );
        const indexOfGun = gunButtonControls.findIndex(
          g => g.control.controlID === inputEvent.input.controlID
        );

        const player = players[indexOfPlayer];

        if (players[indexOfPlayer].entryFee) {
          let gunButton = gunButtonControls[indexOfGun];
          if (player.lastGunVote === "") {
            gunLabelControls[indexOfGun].setText(`[${++gunButton.votes}]`);
            player.lastGunVote = gunButton.control.controlID;
          } else if (
            player.lastGunVote !== "" &&
            player.lastGunVote !== inputEvent.input.controlID
          ) {
            gunLabelControls[indexOfGun].setText(`[${++gunButton.votes}]`);
            const indexOfLastGun = gunButtonControls.findIndex(
              g => g.control.controlID === player.lastGunVote
            );
            let lastGunButton = gunButtonControls[indexOfLastGun];
            gunLabelControls[indexOfLastGun].setText(
              `[${--lastGunButton.votes}]`
            );
            player.lastGunVote = gunButton.control.controlID;
          }
        }
      });
    });
    //==================================================
    //=====================KILLSBUTTONS=================
    //==================================================
    killsButtonControls.forEach(kbc => {
      kbc.control.on("mousedown", async (inputEvent, participant) => {
        if (!votingEnabled) return;

        const indexOfPlayer = players.findIndex(
          player => player.username === participant.username
        );
        const indexOfKills = killsButtonControls.findIndex(
          g => g.control.controlID === inputEvent.input.controlID
        );
        const player = players[indexOfPlayer];

        if (players[indexOfPlayer].entryFee) {
          let killsButton = killsButtonControls[indexOfKills];
          if (player.lastKillsVote === "") {
            killsLabelControls[indexOfKills].setText(
              `[${++killsButton.votes}]`
            );
            player.lastKillsVote = killsButton.control.controlID;
          } else if (
            player.lastKillsVote !== "" &&
            player.lastKillsVote !== inputEvent.input.controlID
          ) {
            killsLabelControls[indexOfKills].setText(
              `[${++killsButton.votes}]`
            );
            const indexOfLastKills = killsButtonControls.findIndex(
              g => g.control.controlID === player.lastKillsVote
            );
            let lastKillsButton = killsButtonControls[indexOfLastKills];
            killsLabelControls[indexOfLastKills].setText(
              `[${--lastKillsButton.votes}]`
            );
            player.lastKillsVote = killsButton.control.controlID;
          }
        }
      });
    });
    //==================================================
    //=====================RANKINGBUTTONS===============
    //==================================================
    rankingButtonControls.forEach(rbc => {
      rbc.control.on("mousedown", async (inputEvent, participant) => {
        if (!votingEnabled) return;

        const indexOfPlayer = players.findIndex(
          player => player.username === participant.username
        );
        const indexOfRanking = rankingButtonControls.findIndex(
          g => g.control.controlID === inputEvent.input.controlID
        );

        const player = players[indexOfPlayer];

        if (players[indexOfPlayer].entryFee) {
          let rankingButton = rankingButtonControls[indexOfRanking];
          if (player.lastRankingVote === "") {
            rankingLabelControls[indexOfRanking].setText(
              `[${++rankingButton.votes}]`
            );
            player.lastRankingVote = rankingButton.control.controlID;
          } else if (
            player.lastRankingVote !== "" &&
            player.lastRankingVote !== inputEvent.input.controlID
          ) {
            rankingLabelControls[indexOfRanking].setText(
              `[${++rankingButton.votes}]`
            );
            const indexOfLastRanking = rankingButtonControls.findIndex(
              g => g.control.controlID === player.lastRankingVote
            );
            let lastRankingButton = rankingButtonControls[indexOfLastRanking];
            rankingLabelControls[indexOfLastRanking].setText(
              `[${--lastRankingButton.votes}]`
            );
            player.lastRankingVote = rankingButton.control.controlID;
          }
        }
      });
    });
  }
  async function CreateVoteControl(enabled) {
    if (enabled) {
      await client.createControls({
        sceneID: defaultSceneId,
        controls: config.voteControlEnabled
      });
    } else {
      await client.createControls({
        sceneID: defaultSceneId,
        controls: config.voteControlDisabled
      });
    }
  }
  await createControls();
  await CreateVoteControl(true);
  await client.ready(true);

  win.webContents.send("online", {});

  ipcMain.on("newRound", async (event, payload) => {
    await client.ready(false);
    players.forEach(player => {
      player.lastGunVote = "";
      player.lastKillsVote = "";
      player.lastRankingVote = "";
      player.entryFee = false;
    });

    gunButtonControls = [];
    gunLabelControls = [];
    killsButtonControls = [];
    killsLabelControls = [];
    rankingButtonControls = [];
    rankingLabelControls = [];
    entryFeeControls = [];

    try {
      const scene = await client.state.getScene("default");
      await scene.deleteAllControls();
      await createControls();
      await CreateVoteControl(true);
      votingEnabled = true;
    } catch (error) {
      console.error(error);
    }
    await client.ready(true);
  });

  ipcMain.on("vote", async (event, payload) => {
    try {
      const scene = await client.state.getScene("default");

      if (votingEnabled) {
        await scene.deleteControl("Vote_Status_Enabled");
        await CreateVoteControl(!votingEnabled);
      } else {
        await scene.deleteControl("Vote_Status_Disabled");
        await CreateVoteControl(!votingEnabled);
      }

      votingEnabled = !votingEnabled;
    } catch (error) {
      console.log(error);
    }
  });

  ipcMain.on("getResults", async (event, payload) => {
    let gun;
    let kills;
    let ranking;
    let winners = [];

    if (payload.gun === "gray") gun = "Gun_Button_1";
    else if (payload.gun === "green") gun = "Gun_Button_2";
    else if (payload.gun === "blue") gun = "Gun_Button_3";
    else if (payload.gun === "purple") gun = "Gun_Button_4";
    else if (payload.gun === "gold") gun = "Gun_Button_5";

    if (payload.kills === 0) kills = "Kills_Button_1";
    else if (payload.kills >= 1 && payload.kills <= 2) kills = "Kills_Button_2";
    else if (payload.kills >= 3 && payload.kills <= 4) kills = "Kills_Button_3";
    else if (payload.kills >= 5 && payload.kills <= 6) kills = "Kills_Button_4";
    else if (payload.kills >= 7) kills = "Kills_Button_5";

    if (payload.ranking >= 61 && payload.ranking <= 100)
      ranking = "Ranking_Button_1";
    else if (payload.ranking >= 21 && payload.ranking <= 60)
      ranking = "Ranking_Button_2";
    else if (payload.ranking >= 11 && payload.ranking <= 20)
      ranking = "Ranking_Button_3";
    else if (payload.ranking >= 4 && payload.ranking <= 10)
      ranking = "Ranking_Button_4";
    else if (payload.ranking >= 1 && payload.ranking <= 3)
      ranking = "Ranking_Button_5";

    players.forEach(player => {
      if (
        player.lastGunVote === gun &&
        player.lastKillsVote === kills &&
        player.lastRankingVote === ranking
      ) {
        winners.push(player.username);
      }
    });

    win.webContents.send("giveResults", winners);
  });
});

//==================================================
//=====================PLAYERS======================
//==================================================
client.state.on("participantJoin", async participant => {
  const indexOfPlayer = players.findIndex(
    player => player.username === participant.username
  );

  if (indexOfPlayer === -1)
    players.push({
      username: participant.username,
      lastGunVote: "",
      lastKillsVote: "",
      lastRankingVote: "",
      entryFee: false
    });
});

client.on("error", error => {
  console.log(Date.now());
  console.error(error);
});

client.open({
  authToken: config.accessToken,
  versionId: config.versionId
});

process.on("uncaughtException", error => {
  logger.log("error", error);
});

process.on("unhandledRejection", error => {
  logger.log("error", error);
});

process.on("warning", warning => {
  logger.log("warning", warning);
});
