import util from "util";
import { exec } from "child_process";
import fs from "fs";

const execPromised = util.promisify(exec);

export function convertToCamelCase(str: string): string {
  const result = convertToPascalCase(str);
  return result[0].toLowerCase() + result.slice(1);
}

export function convertToPascalCase(str: string): string {
  const arr = str.replace(" ", "_").split("_");
  return ["", ...arr].reduce(
    (prev, curr) => prev + curr[0].toUpperCase() + curr.slice(1).toLowerCase()
  );
}

export function getLanguageSpecificTypeDefinition(
  typeCode: string,
  language: "java" | "ts"
) {
  switch (typeCode) {
    case "character":
    case "national character":
    case "character varying":
    case "national character varying":
    case "text":
    case "money":
      return "String";
    case "bytea":
      return "byte[]";
    case "smallint":
    case "smallserial":
    case "integer":
    case "serial":
      return "int";
    case "bigint":
    case "bigserial":
    case "oid":
      return "long";
    case "real":
      return "float";
    case "double precision":
      return "double";
    case "numeric":
    case "decimal":
      return "java.math.BigDecimal";
    case "date":
      return "java.sql.Date";
    case "time with time zone":
    case "time without time zone":
      return "java.sql.Time";
    case "timestamp without time zone":
    case "timestamp with time zone":
      return "java.sql.Timestamp";
    case "boolean":
    case "bit":
      return "boolean";
    default:
      return "string";
  }
}

export function gitClone(url: string, directory: string) {
  return execPromised(`git clone ${escape(url)} ${directory}`);
}

export function gitPull(directory: string) {
  return execPromised(`git -C ${escape(directory)} pull`);
}

export function accessOrCreateDir(directory: string): Promise<any> {
  return fs.promises
    .access(directory)
    .catch(() => fs.promises.mkdir(directory, { recursive: true }));
}