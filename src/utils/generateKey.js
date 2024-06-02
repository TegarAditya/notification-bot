const fs = require("node:fs");
const content = require("crypto").randomBytes(256).toString("base64");
const { parse, stringify } = require("envfile");

const pathToenvFile = ".env";

function setEnv(key, value) {
    fs.readFile(pathToenvFile, "utf8", function (err, data) {
        if (err) {
            return console.log(err);
        }
        var result = parse(data);
        result[key] = value;
        fs.writeFile(pathToenvFile, stringify(result), function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("KEY GENERATED");
        });
    });
}

setEnv("KEY", content);
