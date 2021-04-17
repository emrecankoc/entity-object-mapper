
# Entity-Object-Mapper

Entity-object-mapper is a code generator. Its fetches table and schema defintions from database and generates data access objects from it.

-   Postgres and mysql supported as datasource.
-   Can be extended with EJS templates.

## How To Install

```
npm install entity-object-mapper --save

or

yarn add entity-object-mapper
```

## Usage

Example usages under example folder

```ts
const entityMapper = require("entity-object-mapper")

const objectReverser = new entityMapper.DataSourceReverser("postgres", {
            host: "localhost",
            port: "5432",
            user: "postgres",
            password: "password",
            database: "db",
        });
objectReverser.generateAndExport("schema_name","table_name","template_directory","template_name", "package_name","output_dir");
            
```

## CLI

You can use cli app with npx.

```
npx entity-object-mapper
```

## License

Feel free to contribute

MIT © [emrecankoc](https://github.com/emrecankoc)
