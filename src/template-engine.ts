import ejs from "ejs";
import fs from "fs";

export type TemplateOptions = {
  templatePath: string;
  templater?: "ejs";
};

export type TemplateFunction = (data: any) => string;

export function createTemplate(
  options: TemplateOptions
): Promise<TemplateFunction> {
  return fs.promises
    .readFile(options.templatePath)
    .then((file) => Promise.resolve(file.toString()))
    .then((body) => Promise.resolve(ejs.compile(body)))
    .then((template) => (data: any) => template(data));
}
