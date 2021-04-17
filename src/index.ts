import {
  createDatabaseClient,
  IDatabaseEngine,
  DataSource as dbDataSource,
  DbBuildOptions,
} from "./database-engine";
import {
  createTemplateEngine,
  ITemplateEngine,
  ConfigType,
} from "./template-engine";
import { accessOrCreateDir, gitClone, gitPull } from "./utility";
import path from "path";

export type DataSource = dbDataSource;

export class DataSourceReverser {
  dbEngine: IDatabaseEngine;
  templateEngine: ITemplateEngine;

  constructor(dataSource: DataSource, dbOptions: DbBuildOptions) {
    this.dbEngine = createDatabaseClient(dataSource, dbOptions);
    this.templateEngine = createTemplateEngine();
  }
  getSchemaList(): Promise<string[]> {
    return this.dbEngine.getSchemaList();
  }
  getTableList(schema: string): Promise<string[]> {
    return this.dbEngine.getTableList(schema);
  }
  getTemlateDirList(appdata: string): Promise<string[]> {
    return this.templateEngine.getTemplateDirList(appdata);
  }
  getTemplateList(templateDir: string): Promise<ConfigType[]> {
    return this.templateEngine.getTemplateConfig(templateDir);
  }
  generateAndExport(
    schema: string,
    table: string,
    templateDir: string,
    templateName: string,
    packageName: string,
    outputDir: string
  ): Promise<void> {
    return this.dbEngine
      .getTableInfo(schema, table)
      .then((res) =>
        this.templateEngine.generateAndExport(
          templateDir,
          templateName,
          { ...res, packageName },
          { directory: outputDir, fileName: res.tableName }
        )
      )
      .catch((ex) => console.error(ex));
  }
  generate(
    schema: string,
    table: string,
    templateDir: string,
    templateName: string,
    packageName: string
  ) {
    return this.dbEngine
      .getTableInfo(schema, table)
      .then((table) =>
        this.templateEngine
          .getTemplateBody(templateDir, templateName)
          .then((body) =>
            this.templateEngine.generate(body, { table, packageName })
          )
      )
      .catch((ex) => console.error(ex));
  }
  close() {
    this.dbEngine.close();
  }
}

export function installTemplate(
  gitUrl: string,
  templateDir: string
): Promise<void> {
  return accessOrCreateDir(templateDir)
    .then(() => gitClone(gitUrl, templateDir))
    .then((res) => console.info(res.stdout));
}

export function getTemplateDirList(maindir: string): Promise<string[]> {
  const engine = createTemplateEngine();
  return accessOrCreateDir(maindir).then(() =>
    engine.getTemplateDirList(maindir)
  );
}

export function updateTemplate(templateDir: string, templateName: string) {
  return gitPull(path.join(templateDir, templateName)).then((res) => true);
}
