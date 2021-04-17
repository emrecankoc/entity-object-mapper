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
const entityMapper = require("entity-object-mapper");

const objectReverser = new entityMapper.DataSourceReverser("postgres", {
  host: "localhost",
  port: "5432",
  user: "postgres",
  password: "password",
  database: "db",
});
// generate and export directly
objectReverser.generateAndExport(
  {
    schema: schema, // schema name
    table: tableName, // table name
    templateDir: templatedir, // template directory
    templateName: templateName, // template name
    packageName: packageName,
  },
  process.cwd() // directory to export
);

// or get as string
objectReverser.generate({
  schema: schema, // schema name
  table: tableName, // table name
  templateDir: templatedir, // template directory
  templateName: templateName, // template name
  packageName: packageName,
});
```

## CLI

You can use cli app with npx.

```
npx entity-object-mapper
```

## License

Feel free to contribute

MIT © [emrecankoc](https://github.com/emrecankoc)
