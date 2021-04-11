#!/usr/bin/env ts-node

import {
  DataSourceReverser,
  installTemplate,
  getTemplateDirList,
} from "../src";
import prompts from "prompts";
import path from "path";
import packageJSON from "../package.json";

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

const myArgs = process.argv.slice(2);

if (myArgs[0]) {
  switch (myArgs[0]) {
    case "manage":
      runManage(myArgs.slice(1));
      break;
    case "help":
      showUsage();
    default:
      console.error("use help command to see usage options");
      break;
  }
} else {
  runQuestion();
}
function showUsage() {
  const output = `ETOOMAP
  Entity to Object Mapper

Usage Options:

  manage help                     -
  manage i <git_command>          install templates
  manage ls                       list installed templates
  manage update <template_name>   update template

  `;
  console.info(output);
}

function runManage(args: string[]) {
  switch (args[0]) {
    case "install":
    case "i":
      // install template
      if (!!!args[1]) {
        console.error("git url required");
        break;
      }
      installTemplate(args[1], TEMPLATE_DIR);
      break;
    case "ls":
      // list templates
      getTemplateDirList(TEMPLATE_DIR).then((list) => {
        if (list && list.length > 0) {
          list.map((x) => console.info(x + "\n"));
        } else {
          console.info("No template found");
        }
      });
      break;
    case "update":
      if (!!!args[1]) {
        console.error("template name required");
        break;
      }
      console.error("not implemented");
      //updateTemplate(TEMPLATE_DIR, args[1]);
      break;
    default:
      console.error("use help command to see usage options");
      break;
  }
}

function runQuestion() {
  prompts({
    type: "select",
    name: "datasource",
    message: "Data source",
    choices: [
      { title: "Postgres", value: "postgres" },
      { title: "Mysql", value: "mysql" },
    ],
  })
    .then((dataSource) => {
      prompts([
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
          initial: dataSource.datasource === "postgres" ? 5432 : 3306,
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
          initial: dataSource.datasource === "postgres" ? "postgres" : "root",
        },
        {
          type: "password",
          name: "password",
          message: "Password",
        },
      ])
        .then(async (data) => {
          console.info("connecting to datasource...");
          const objectReverser = new DataSourceReverser(dataSource.datasource, {
            host: data.host,
            port: data.port,
            user: data.user,
            password: data.password,
            database: data.database,
          });
          try {
            const schemaList = await objectReverser.getSchemaList();
            const schemaSelect = await prompts({
              type: "select",
              name: "schema",
              message: "Schema",
              choices: schemaList.map((it) => ({ title: it, value: it })),
            });

            const tableList = await objectReverser.getTableList(
              schemaSelect.schema
            );
            const tableSelect = await prompts({
              type: "select",
              name: "tableName",
              message: "Table Name",
              choices: tableList.map((it) => ({ title: it, value: it })),
            });
            let dirList = [
              {
                title: "default-templates",
                value: path.resolve(__dirname, "default-templates"),
              },
            ];
            try {
              const templateDirList = await objectReverser.getTemlateDirList(
                TEMPLATE_DIR
              );
              dirList = templateDirList
                .map((it) => ({
                  title: it,
                  value: path.join(TEMPLATE_DIR, it),
                }))
                .concat(dirList);
            } catch (error) {}

            const directorySelection = await prompts({
              type: "select",
              name: "templatedir",
              message: "Template set",
              choices: dirList,
            });

            const templateList = await objectReverser.getTemplateList(
              directorySelection.templatedir
            );
            const templateSelect = await prompts({
              type: "select",
              name: "templateName",
              message: "Template Name",
              choices: templateList.map((it) => ({
                title: it.name,
                value: it.name,
              })),
            });

            await objectReverser.generateAndExport(
              schemaSelect.schema,
              tableSelect.tableName,
              directorySelection.templatedir,
              templateSelect.templateName,
              "io.github.emrecankoc",
              process.cwd()
            );
            console.info("execution done...");
          } finally {
            console.info("closing connection...");
            objectReverser.close();
          }
        })
        .catch((err) => console.error(err));
    })
    .catch((err) => console.error(err));
}
