const { execSync } = require("node:child_process");
const path = require("node:path");

module.exports = async () => {
  require("dotenv").config({
    path: path.resolve(__dirname, "../../.env.test"),
    override: true,
  });

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: process.env,
    stdio: "ignore",
  });
};
