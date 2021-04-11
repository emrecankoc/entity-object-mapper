
# ENTITY-OBJECT-MAPPER

Entity-object-mapper gathers table information from database then generates code with ejs templates. 

Postgres and mysql supported as datasource.

## Install



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

## License

MIT © [emrecankoc](https://github.com/emrecankoc)

PS: Project template based on [create-react-library](https://github.com/transitive-bullshit/create-react-library)