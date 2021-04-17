# Entity-Object-Mapper

Entity-object-mapper is a code generator. Its fetches table and schema defintions from database and generates data access objects from it.

- Postgres and mysql supported as datasource.
- Can be extended with EJS templates.

## How To Install

```
npm install entity-object-mapper --save

or

yarn add entity-object-mapper
```

## Usage

Example usages under example folder

```ts
const { generateFromDataSource } = require("entity-object-mapper");

const generatedCode = generateFromDataSource({
  databaseOptions: {
    config: {
      database: "db",
      host: "localhost",
      port: 5432,
      user: "user",
      password: "password",
    },
    datasource: "postgres",
  },
  language: "java",
  schema: "schema",
  table: "table",
  templateOptions: {
    templatePath: "/TEMPLATE_DIRECTORY",
    templater: "ejs",
  },
  extras: {
    packageName: "package_name",
  },
});

// or export directly
generateFromDataSourceAndExport(
  {
    databaseOptions: {
      config: {
        database: "db",
        host: "localhost",
        port: 5432,
        user: "user",
        password: "password",
      },
      datasource: "postgres",
    },
    language: "java",
    schema: "schema",
    table: "table",
    templateOptions: {
      templatePath: "/TEMPLATE_DIRECTORY",
      templater: "ejs",
    },
    extras: {
      packageName: "package_name",
    },
  },
  "/EXPORT_DIRECTORY"
);
```

## CLI

You can use cli app with npx.

```
npx entity-object-mapper
```

## License

Feel free to contribute

MIT © [emrecankoc](https://github.com/emrecankoc)
