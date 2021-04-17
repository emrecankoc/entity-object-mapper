import fs from "fs";

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

export function accessDirSafe(directory: string): Promise<any> {
  if (!fs.existsSync(directory)) {
    return fs.promises.mkdir(directory, { recursive: true });
  }
  return Promise.resolve();
}

export function exportFile(filePath: string, body: string) {
  return fs.promises.writeFile(filePath, body, {
    flag: "w",
    encoding: "utf-8",
  });
}
