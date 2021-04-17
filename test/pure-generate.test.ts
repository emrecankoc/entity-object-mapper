import { generate } from "../src";
import { ColumnInfo } from "../src/database-engine";
import fs from "fs";
import path from "path";

const actorSimpleJava = fs.readFileSync(
  path.resolve(__dirname, "test-templates/actor-simple-java-result.txt")
).toString();

const templatePath = path.resolve(__dirname, "test-templates/simple-java.ejs");
test("generate without datasource", () => {
  return generate(
    { templatePath: templatePath },
    {
      schema: "public",
      tableName: "actor",
      columns: [
        new ColumnInfo("actor_id", "0", "integer", true),
        new ColumnInfo("first_name", "", "text", false),
        new ColumnInfo("last_name", "", "text", false),
        new ColumnInfo("last_update", "", "timestamp with time zone", false),
      ],
    },
    "java",
    { packageName: "packagename" }
  ).then((data) => expect(data).toBe(actorSimpleJava));
});
