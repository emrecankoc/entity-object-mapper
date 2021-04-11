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
import { accessOrCreateDir, GitWrapper } from "./utility";
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
  close() {
    this.dbEngine.close();
  }
}

export function installTemplate(
  gitUrl: string,
  templateDir: string
): Promise<void> {
  const gitClient = new GitWrapper();
  return accessOrCreateDir(templateDir)
    .then(() => gitClient.clone(gitUrl, templateDir))
    .then((res) => console.info(res.stdout));
}

export function getTemplateDirList(maindir: string): Promise<string[]> {
  const engine = createTemplateEngine();
  return accessOrCreateDir(maindir).then(() =>
    engine.getTemplateDirList(maindir)
  );
}

export function updateTemplate(templateDir: string, templateName: string) {
  const gitClient = new GitWrapper();
  return gitClient.pull(path.join(templateDir, templateName));
}
