#!/usr/bin/env ts-node-script

import { createDatabaseClient } from "../src/database-engine";
import { generate, TemplateConfig } from "../src";
import { convertToPascalCase, exportFile } from "../src/utility";
import prompts from "prompts";
import path from "path";
import packageJSON from "../package.json";
import fs from "fs";

const DATA_DIR =
  process.env.APPDATA ||
  (process.platform == "darwin"
    ? process.env.HOME + "/Library/Preferences"
    : process.env.HOME + "/.local/share");

const TEMPLATE_DIR = path.join(
  DATA_DIR,
  packageJSON.author,
  packageJSON.name,
  "templates"
);

questions();

async function questions() {
  const { datasource } = await prompts({
    type: "select",
    name: "datasource",
    message: "Data source",
    choices: [
      { title: "Postgres", value: "postgres" },
      { title: "Mysql", value: "mysql" },
    ],
  });

  const dbOptions = await prompts([
    {
      type: "text",
      name: "host",
      message: "Host",
      initial: "localhost",
    },
    {
      type: "number",
      name: "port",
      message: "Port",
      initial: datasource === "postgres" ? 5432 : 3306,
    },
    {
      type: "text",
      name: "database",
      message: "Database",
    },
    {
      type: "text",
      name: "user",
      message: "User",
      initial: datasource === "postgres" ? "postgres" : "root",
    },
    {
      type: "password",
      name: "password",
      message: "Password",
    },
  ]);

  console.info("connecting to datasource...");
  const db = createDatabaseClient({
    datasource: datasource,
    config: dbOptions,
  });
  try {
    const schemaList = await db.runSingleQuery(
      "SELECT T.schema_name FROM INFORMATION_SCHEMA.SCHEMATA T"
    );
    const { schema } = await prompts({
      type: "select",
      name: "schema",
      message: "Schema",
      choices: schemaList.rows.map((it) => ({
        title: it["schema_name"],
        value: it["schema_name"],
      })),
    });

    const tableList = await db.runSingleQuery(
      "SELECT T.table_name FROM INFORMATION_SCHEMA.TABLES T WHERE T.TABLE_SCHEMA = $1",
      [schema]
    );
    const { tableName } = await prompts({
      type: "select",
      name: "tableName",
      message: "Table Name",
      choices: tableList.rows.map((it) => ({
        title: it["table_name"],
        value: it["table_name"],
      })),
    });

    const dirList = [
      {
        title: "default-templates",
        value: path.resolve(__dirname, "default-templates"),
      },
    ];

    try {
      const readDirResult = await fs.promises.readdir(TEMPLATE_DIR);

      for (const item of readDirResult) {
        const dirPath = path.join(TEMPLATE_DIR, item);
        const isDir = fs.lstatSync(dirPath);
        if (isDir.isDirectory()) {
          dirList.push({ title: item, value: dirPath });
        }
      }
    } catch (error) {}

    const { templatedir } = await prompts({
      type: "select",
      name: "templatedir",
      message: "Template set",
      choices: dirList,
    });

    const templateConfig: TemplateConfig[] = JSON.parse(
      fs.readFileSync(path.join(templatedir, "config.json")).toString()
    ).templates;

    const { templ } = await prompts({
      type: "select",
      name: "templ",
      message: "Template Name",
      choices: templateConfig.map((it) => ({
        title: it.name,
        value: it.name,
      })),
    });

    const { packageName } = await prompts({
      type: "text",
      name: "packageName",
      message: "Package name",
    });

    const { templateFile, language } = templateConfig.find(
      (it) => it.name == templ
    ) || { language: "", templateFile: "" };

    const templatePath = path.join(templatedir, templateFile);
    const outputPath = path.join(
      process.cwd(),
      `${convertToPascalCase(tableName)}.${language}`
    );
    await db
      .getTableInfo(schema, tableName)
      .then((tableInfo) =>
        generate({ templatePath: templatePath }, tableInfo, language, {
          packageName: packageName,
        })
      )
      .then((result) => exportFile(outputPath, result))
      .then(() => console.info("done..."));
  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
}
