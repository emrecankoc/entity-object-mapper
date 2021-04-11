import pg from "pg";
import mysql from "mysql";
import {
  convertToCamelCase,
  convertToPascalCase,
  getLanguageSpecificTypeDefinition,
} from "./utility";

export type DataSource = "postgres" | "mysql";

export type DbBuildOptions = {
  user?: string;
  database?: string;
  password?: string;
  port?: number;
  host?: string;
  connectionString?: string;
};

export type QueryResult = {
  rows: any[];
  hasRows: boolean;
};

export type ColumnInfo = {
  name: string;
  camelCaseName: string;
  pascalCaseName: string;
  defaultValue: string;
  type: string;
  isPrimaryKey: number;
};

export type TableInfo = {
  schema: string;
  tableName: string;
  columns?: ColumnInfo[];
};

export interface IDatabaseEngine {
  runSingleQuery(query: string, values?: any[]): Promise<QueryResult>;
  getSchemaList(): Promise<string[]>;
  getTableList(schema: string): Promise<string[]>;
  getTableInfo(schema: string, tableName: string): Promise<TableInfo>;
  close(): void;
}

const QUERY_POSTGRES_TABLE_INFO = `
SELECT COLS.COLUMN_NAME,
	COLS.COLUMN_DEFAULT,
	COLS.IS_NULLABLE,
	COLS.DATA_TYPE,
	COALESCE(CONS.IS_PRIMARY_KEY,0) AS IS_PRIMARY_KEY
FROM INFORMATION_SCHEMA.COLUMNS COLS
LEFT JOIN
				(SELECT TC.TABLE_SCHEMA,
						TC.TABLE_NAME,
						KC.COLUMN_NAME,
						1 IS_PRIMARY_KEY
					FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS TC
					LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KC ON KC.TABLE_NAME = TC.TABLE_NAME
					AND KC.TABLE_SCHEMA = TC.TABLE_SCHEMA
					AND KC.CONSTRAINT_NAME = TC.CONSTRAINT_NAME
					WHERE TC.CONSTRAINT_TYPE = 'PRIMARY KEY') CONS ON CONS.TABLE_SCHEMA = COLS.TABLE_SCHEMA
AND CONS.TABLE_NAME = COLS.TABLE_NAME
AND CONS.COLUMN_NAME = COLS.COLUMN_NAME
WHERE COLS.TABLE_SCHEMA = $1
				AND COLS.TABLE_NAME = $2
`;

const QUERY_MYSQL_TABLE_INFO = `
SELECT COLS.COLUMN_NAME,
	COLS.COLUMN_DEFAULT,
	COLS.IS_NULLABLE,
	COLS.DATA_TYPE,
	COALESCE(CONS.IS_PRIMARY_KEY,0) AS IS_PRIMARY_KEY
FROM INFORMATION_SCHEMA.COLUMNS COLS
LEFT JOIN
				(SELECT TC.TABLE_SCHEMA,
						TC.TABLE_NAME,
						KC.COLUMN_NAME,
						1 IS_PRIMARY_KEY
					FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS TC
					LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KC ON KC.TABLE_NAME = TC.TABLE_NAME
					AND KC.TABLE_SCHEMA = TC.TABLE_SCHEMA
					AND KC.CONSTRAINT_NAME = TC.CONSTRAINT_NAME
					WHERE TC.CONSTRAINT_TYPE = 'PRIMARY KEY') CONS ON CONS.TABLE_SCHEMA = COLS.TABLE_SCHEMA
AND CONS.TABLE_NAME = COLS.TABLE_NAME
AND CONS.COLUMN_NAME = COLS.COLUMN_NAME
WHERE COLS.TABLE_SCHEMA = ?
				AND COLS.TABLE_NAME = ?
`;

class PostgressWrapper implements IDatabaseEngine {
  client: pg.Pool;
  constructor(options: DbBuildOptions) {
    this.client = new pg.Pool({
      user: options.user,
      password: options.password,
      database: options.database,
      port: options.port,
      host: options.host,
      query_timeout: 10000, //10 second
      connectionTimeoutMillis: 30000, // 30 second
    });
  }
  runSingleQuery(query: string, values?: any[]): Promise<QueryResult> {
    return this.client.query(query, values).then((result) => ({
      hasRows: result.rowCount > 0,
      rows: result.rows,
    }));
  }
  getSchemaList(): Promise<string[]> {
    return this.runSingleQuery(
      "SELECT T.SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA T"
    ).then((result) => {
      if (result.hasRows) {
        return result.rows?.map((it) => <string>it["schema_name"]);
      }
      throw new Error("No schema found.");
    });
  }
  getTableList(schema: string): Promise<string[]> {
    return this.runSingleQuery(
      "SELECT T.TABLE_NAME FROM INFORMATION_SCHEMA.TABLES T WHERE T.TABLE_SCHEMA = $1",
      [schema]
    ).then((result) => {
      if (result.hasRows) {
        return result.rows?.map((it) => <string>it["table_name"]);
      }
      throw new Error(`No table found in schema ${schema}`);
    });
  }
  getTableInfo(schema: string, tableName: string): Promise<TableInfo> {
    return this.runSingleQuery(QUERY_POSTGRES_TABLE_INFO, [
      schema,
      tableName,
    ]).then((result) => {
      if (result.hasRows) {
        const columns = result.rows.map((it) => ({
          name: <string>it["column_name"],
          camelCaseName: convertToCamelCase(<string>it["column_name"]),
          pascalCaseName: convertToPascalCase(<string>it["column_name"]),
          defaultValue: <string>it["column_default"],
          type: getLanguageSpecificTypeDefinition(
            <string>it["data_type"],
            "java"
          ),
          isPrimaryKey: <number>it["is_primary_key"],
        }));
        return {
          schema,
          tableName: convertToPascalCase(tableName),
          columns,
        };
      }
      throw new Error(`Table not found, ${schema}.${tableName}`);
    });
  }
  close(): void {
    this.client.end();
  }
}

class MysqlWrapper implements IDatabaseEngine {
  client: mysql.Connection;
  constructor(options: DbBuildOptions) {
    this.client = mysql.createConnection({
      user: options.user,
      password: options.password,
      host: options.host,
      port: options.port,
      database: options.database,
    });
  }
  runSingleQuery(query: string, values?: any): Promise<QueryResult> {
    return new Promise((resolve, reject) =>
      this.client.query({ sql: query, values: values }, (err, rows, fields) => {
        if (err) {
          reject(err);
        }
        const output: QueryResult = {
          hasRows: true,
          rows: rows,
        };
        resolve(output);
      })
    );
  }
  getSchemaList(): Promise<string[]> {
    return this.runSingleQuery(
      "SELECT T.SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA T"
    ).then((result) => {
      if (result.hasRows) {
        return result.rows?.map((it) => <string>it["SCHEMA_NAME"]);
      }
      throw new Error("No schema found.");
    });
  }
  getTableList(schema: string): Promise<string[]> {
    return this.runSingleQuery(
      "SELECT T.TABLE_NAME FROM INFORMATION_SCHEMA.TABLES T WHERE T.TABLE_SCHEMA = ?",
      [schema]
    ).then((result) => {
      if (result.hasRows) {
        return result.rows?.map((it) => <string>it["TABLE_NAME"]);
      }
      throw new Error(`No table found in schema ${schema}`);
    });
  }
  getTableInfo(schema: string, tableName: string): Promise<TableInfo> {
    return this.runSingleQuery(QUERY_MYSQL_TABLE_INFO, [
      schema,
      tableName,
    ]).then((result) => {
      if (result.hasRows) {
        const columns = result.rows.map((it) => ({
          name: <string>it["COLUMN_NAME"],
          camelCaseName: convertToCamelCase(<string>it["COLUMN_NAME"]),
          pascalCaseName: convertToPascalCase(<string>it["COLUMN_NAME"]),
          defaultValue: <string>it["COLUMN_DEFAULT"],
          type: getLanguageSpecificTypeDefinition(
            <string>it["DATA_TYPE"],
            "java"
          ),
          isPrimaryKey: <number>it["IS_PRIMARY_KEY"],
        }));
        return {
          schema,
          tableName: convertToPascalCase(tableName),
          columns,
        };
      }
      throw new Error(`Table not found, ${schema}.${tableName}`);
    });
  }
  close(): void {
    this.client.end();
  }
}

export function createDatabaseClient(
  datasource: DataSource,
  options: DbBuildOptions
): IDatabaseEngine {
  if (datasource === "postgres") {
    return new PostgressWrapper(options);
  } else if (datasource === "mysql") {
    return new MysqlWrapper(options);
  }
  throw new Error("Unsupported data source type");
}
