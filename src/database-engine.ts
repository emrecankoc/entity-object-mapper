import pg from "pg";
import mysql from "mysql";
import {
  convertToCamelCase,
  convertToPascalCase,
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

export class ColumnInfo {
  name: string;
  camelCaseName: string;
  pascalCaseName: string;
  defaultValue: string;
  type: string;
  isPrimaryKey: boolean;
  constructor(
    name: string,
    defaultValue: string,
    type: string,
    isPrimaryKey: boolean
  ) {
    this.name = name;
    this.defaultValue = defaultValue;
    this.type = type;
    this.isPrimaryKey = isPrimaryKey;
    this.camelCaseName = convertToCamelCase(name);
    this.pascalCaseName = convertToPascalCase(name);
  }
}

export type TableInfo = {
  schema: string;
  tableName: string;
  columns?: ColumnInfo[];
};

export interface IDatabaseEngine {
  runSingleQuery(query: string, values?: any[]): Promise<QueryResult>;
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
SELECT COLS.column_name,
	COLS.column_default,
	COLS.is_nullable,
	COLS.data_type,
	COALESCE(CONS.IS_PRIMARY_KEY,0) AS ,s_primary_key
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
      query_timeout: 30000, //30 second
      connectionTimeoutMillis: 60000, // 30 second
    });
  }
  runSingleQuery(query: string, values?: any[]): Promise<QueryResult> {
    return this.client.query(query, values).then((result) => ({
      hasRows: result.rowCount > 0,
      rows: result.rows,
    }));
  }
  getTableInfo(schema: string, tableName: string): Promise<TableInfo> {
    return this.runSingleQuery(QUERY_POSTGRES_TABLE_INFO, [
      schema,
      tableName,
    ]).then((result) => {
      if (!result.hasRows)
        throw new Error(`Table not found ${schema}.${tableName}`);
      return {
        schema,
        tableName: convertToPascalCase(tableName),
        columns: mapToColumnInfoList(result.rows),
      };
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
    const querySql = query.replace("\$\d", "?");
    return new Promise((resolve, reject) =>
      this.client.query({ sql: querySql, values: values }, (err, rows, fields) => {
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
  getTableInfo(schema: string, tableName: string): Promise<TableInfo> {
    return this.runSingleQuery(QUERY_MYSQL_TABLE_INFO, [
      schema,
      tableName,
    ]).then((result) => {
      if (!result.hasRows)
        throw new Error(`Table not found ${schema}.${tableName}`);
      return {
        schema,
        tableName: convertToPascalCase(tableName),
        columns: mapToColumnInfoList(result.rows),
      };
    });
  }
  close(): void {
    this.client.end();
  }
}

export type DataSourceOptions = {
  datasource: DataSource;
  config: DbBuildOptions;
};

export function createDatabaseClient(
  options: DataSourceOptions
): IDatabaseEngine {
  if (options.datasource === "postgres") {
    return new PostgressWrapper(options.config);
  } else if (options.datasource === "mysql") {
    return new MysqlWrapper(options.config);
  }
  throw new Error("Unsupported data source type");
}

function mapToColumnInfoList(rows: any) {
  const columns: ColumnInfo[] = [];

  for (const iterator of rows) {
    const column_name = iterator["column_name"] as string;
    const column_default = iterator["column_default"] as string;
    const data_type = iterator["data_type"] as string;
    const is_primary_key = iterator["is_primary_key"] == "1";

    columns.push(
      new ColumnInfo(column_name, column_default, data_type, is_primary_key)
    );
  }
  return columns;
}
