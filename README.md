[![Mixpanel Data Migration](http://www.liquidframeworks.com/sites/default/files/LiqFra_header_logo.png)](http://www.liquidframeworks.com/)
# mixpanel-data-migration

## Getting Started
Install Dependencies

```term
$ npm install
```

## Migrating Data

### Migrate all data (2013 - 2017):
This will migrate the data (export and import) the data for each year, for each month by day.
```term
./migrate_data.js
```

### Migrate data for a given year
This will migrate the data (export and import) the data for the given year, for each month by day.
```term
./migrate_data.js 2017
```

### Migrate data for Dec 2017
This will migrate the data (export and import) the data for the given year/month by day.
```term
./migrate_data.js 2017 12
```

### Migrate data for Dec 10, 2017
This will migrate the data (export and import) the data for the given date.
```term
./migrate_data.js 2017 12 10
```

