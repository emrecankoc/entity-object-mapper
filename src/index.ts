import {
  createDatabaseClient,
  DataSourceOptions,
  TableInfo,
} from "./database-engine";
import { createTemplate, TemplateOptions } from "./template-engine";
import { convertToPascalCase, exportFile } from "./utility";

export type TemplateConfig = {
  name: string;
  language: string;
  templateFile: string;
};

export type DataSourceGenerateInput = {
  databaseOptions: DataSourceOptions;
  templateOptions: TemplateOptions;
  schema: string;
  table: string;
  language: string;
  extras?: any;
};

export function generate(
  templateOptions: TemplateOptions,
  tableInfo: TableInfo,
  language: string,
  extras?: any
) {
  const tableData: TableInfo = {
    tableName: convertToPascalCase(tableInfo.tableName),
    schema: tableInfo.schema,
    columns: tableInfo.columns?.map((iter) => ({
      ...iter,
      type: entityTypeResolver(iter.type, language),
    })),
  };

  return createTemplate(templateOptions).then((template) =>
    template({ ...tableData, ...extras })
  );
}

export function generateFromDataSource(
  input: DataSourceGenerateInput
): Promise<string> {
  const {
    databaseOptions,
    templateOptions,
    schema,
    table,
    extras,
    language,
  } = input;
  const db = createDatabaseClient(databaseOptions);
  return db
    .getTableInfo(schema, table)
    .then((tableInfo) =>
      generate(templateOptions, tableInfo, language, extras)
    );
}

export function generateFromDataSourceAndExport(
  input: DataSourceGenerateInput,
  exportPath: string
) {
  return generateFromDataSource(input).then((result) =>
    exportFile(exportPath, result)
  );
}

function entityTypeResolver(typeCode: string, language: string) {
  if (language === "java") {
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
  } else {
    throw new Error("Unkown language specified");
  }
}
