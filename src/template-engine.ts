import ejs from "ejs";
import { promises as fs, statSync as fsStatSync } from "fs";
import path from "path";

export interface ITemplateEngine {
  getTemplateConfig(templateDir: string): Promise<ConfigType[]>;
  getTemplateBody(
    templateDir: string,
    templateName: string
  ): Promise<TemplateInfo>;
  getTemplateDirList(appdata: string): Promise<string[]>;
  generate(templateStr: TemplateInfo, data: any): Promise<string>;
  export(path: string, body: string): Promise<void>;
  generateAndExport(
    templateDir: string,
    templateName: string,
    data: any,
    exportInfo: FileExportInfo
  ): Promise<void>;
}

export type ConfigType = {
  name: string;
  language: string;
  extension: string;
  inputType: string;
  templateFile: string;
};

export type TemplateInfo = {
  body: string;
  config: ConfigType;
};

export type FileExportInfo = {
  directory: string;
  fileName: string;
};

abstract class BaseTemplateEngine implements ITemplateEngine {
  getTemplateDirList(appdata: string): Promise<string[]> {
    return fs.readdir(appdata).then((resutList) => {
      const dirList = [];
      for (const item of resutList) {
        const dirPath = path.join(appdata, item);
        const isDir = fsStatSync(dirPath);
        if (isDir.isDirectory()) {
          dirList.push(item);
        }
      }
      return dirList;
    });
  }
  generateAndExport(
    templateDir: string,
    templateName: string,
    data: any,
    exportInfo: FileExportInfo
  ): Promise<void> {
    return this.getTemplateBody(templateDir, templateName).then((result) =>
      this.generate(result, data).then((generatedOutput) =>
        this.export(
          path.join(
            exportInfo.directory,
            `${exportInfo.fileName}.${result.config.extension}`
          ),
          generatedOutput
        )
      )
    );
  }
  abstract generate(templateStr: TemplateInfo, data: any): Promise<string>;
  getTemplateBody(
    templateDir: string,
    templateName: string
  ): Promise<TemplateInfo> {
    return this.getTemplateConfig(templateDir)
      .then((configList) => configList.find((x) => x.name === templateName))
      .then((config) => {
        if (!config) {
          throw new Error("Template not found");
        }
        return fs
          .readFile(path.join(templateDir, config?.templateFile))
          .then((file) => ({
            body: file.toString(),
            config,
          }));
      });
  }
  getTemplateConfig(templateDir: string): Promise<ConfigType[]> {
    // read config json first
    const configPath = path.join(templateDir, "config.json");
    return fs.readFile(configPath).then((res) => {
      return JSON.parse(res.toString());
    });
  }
  export(filePath: string, body: string): Promise<void> {
    return fs.writeFile(filePath, body, {
      flag: "w",
      encoding: "utf-8",
    });
  }
}

class EJSTemplateEngine extends BaseTemplateEngine {
  generate(tempInfo: TemplateInfo, data: any): Promise<string> {
    return ejs.compile(tempInfo.body, { async: true })(data);
  }
}

export function createTemplateEngine(engine?: string) {
  return new EJSTemplateEngine(); //default engine
}
