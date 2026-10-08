const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "..", "data");

const load = (name) => {
  const file = path.join(DATA, `${name}.json`);

  return fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf-8"))
    : [];
};

const save = (name, rows) => {
  fs.mkdirSync(DATA, { recursive: true });

  fs.writeFileSync(
    path.join(DATA, `${name}.json`),
    JSON.stringify(rows, null, 2)
  );
};

module.exports = {
  load,
  save
};