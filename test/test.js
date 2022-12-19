const assert = require('assert');
const sql = require('../dist');

describe('SqlQueryGenerator', function () {
    describe('use()', function (){
        it('postgres dialect', function () {
            sql.use('postgres');
            let query = sql.select('table', ['id']);
            assert.strictEqual(query.dialect, "postgres")
        });

        it('mysql dialect', function () {
            sql.use('mysql');
            let query = sql.select('table', ['id']);
            assert.strictEqual(query.dialect, "mysql")
        });

        it('mssql dialect', function () {
            sql.use('mssql');
            let query = sql.select('table', ['id']);
            assert.strictEqual(query.dialect, "mssql")
        });
    });

    describe('select()', function () {
        it('1 field', function () {
            let query = sql.select('table', ['id']);
            assert.strictEqual(query.text, "SELECT id FROM table");
            assert.deepStrictEqual(query.values, []);
        })

        it('1 field passing only a string', function () {
            let query = sql.select('table', 'id');
            assert.strictEqual(query.text, "SELECT id FROM table");
            assert.deepStrictEqual(query.values, []);
        })

        it('2 fields', function () {
            let query = sql.select('table', ['id', 'name']);
            assert.strictEqual(query.text, "SELECT id, name FROM table");
            assert.deepStrictEqual(query.values, []);
        })

        it('with a join', function () {
            let query = sql.select('table', ['id', 'name']).join('other_table', { 'table.id': 'other_table.id' });
            assert.strictEqual(query.text, "SELECT id, name FROM table INNER JOIN other_table ON table.id = other_table.id");
            assert.deepStrictEqual(query.values, []);
        })

        it('with a where as object', function () {
            let query = sql.select('table', ['id', 'name']).where({ id: 2 });
            assert.strictEqual(query.text, "SELECT id, name FROM table WHERE id = $1");
            assert.deepStrictEqual(query.values, [2]);
        })

        it('with a where as string', function () {
            let query = sql.select('table', ['id', 'name']).where("id IS NULL").and("name IS NOT NULL")
            assert.strictEqual(query.text, "SELECT id, name FROM table WHERE id IS NULL AND name IS NOT NULL");
            assert.deepStrictEqual(query.values, []);
        })

        it('with a order by', function () {
            let query = sql.select('table', ['id', 'name']).orderby(["name"])
            assert.strictEqual(query.text, "SELECT id, name FROM table ORDER BY name");
        })

        it('with a limit', function () {
            sql.use('postgres');
            let query = sql.select('table', ['id', 'name']).orderby(["name"]).limit(200)
            assert.strictEqual(query.text, "SELECT id, name FROM table ORDER BY name LIMIT 200");
        })

        it('should thrown an error when limit is not a number', function () {
            assert.throws(()=> sql.select('table', ['id', 'name']).orderby(["name"]).limit("1; DROP TABLE user; --"));
            assert.throws(()=> sql.select('table', ['id', 'name']).orderby(["name"]).limit(10, "1; DROP TABLE user; --"));
        })

        it('with a limit and postgres offset', function () {
            sql.use("postgres");
            let query = sql.select('table', ['id', 'name']).orderby(["name"]).limit(200, 10)
            assert.strictEqual(query.text, "SELECT id, name FROM table ORDER BY name LIMIT 200 OFFSET 10");
        })

        it('with a limit and mysql offset', function () {
            sql.use("mysql");
            let query = sql.select('table', ['id', 'name']).orderby(["name"]).limit(200, 10)
            assert.strictEqual(query.text, "SELECT id, name FROM table ORDER BY name LIMIT 10, 200");
        })

        it('should throw an error when limit is use with mssql', function () {
            sql.use("mssql");
            assert.throws(()=> sql.select('table', ['id', 'name']).orderby(["name"]).limit(200, 10));
        })

        it('with a group by', function () {
            let query = sql.select('table', ['COUNT(id)', 'name']).groupby(["name"])
            assert.strictEqual(query.text, "SELECT COUNT(id), name FROM table GROUP BY name");
        })

        it('with a group by + having + orderby', function () {
            let query = sql.select('table', ['COUNT(id)', 'name']).groupby(["name"]).having({'COUNT(id)': 5}, '>').orderby('COUNT(id) DESC');
            assert.strictEqual(query.text, "SELECT COUNT(id), name FROM table GROUP BY name HAVING COUNT(id) > $1 ORDER BY COUNT(id) DESC");
            assert.deepStrictEqual(query.values, [5]);
        })
    });

    describe('insert()', function () {
        it('Single Value', function () {
            let query = sql.insert("table", { f1: 2 });
            assert.strictEqual(query.text, "INSERT INTO table (f1) VALUES ('2')");
            assert.deepStrictEqual(query.values, [2]);
        });
        it('Double Value', function () {
            let query = sql.insert("table", { f1: 2, f2: 'string' });
            assert.strictEqual(query.text, "INSERT INTO table (f1, f2) VALUES ('2','string')");
            assert.deepStrictEqual(query.values, [2, 'string']);
        });

        it('with returning clause', function () {
            let query = sql.insert("table", { id: 1, title: "test" }).returning(["*"]);
            assert.strictEqual(query.text, "INSERT INTO table (id, title) VALUES ('1','test') RETURNING *");
            assert.deepStrictEqual(query.values, [1, 'test']);
        });
    });

    describe('update()', function () {
        it('Single value', function () {
            let query = sql.update("table", { f1: 2 });
            assert.strictEqual(query.text, "UPDATE table SET f1='2'");
            assert.deepStrictEqual(query.values, [2]);
        });

        it('Double value', function () {
            let query = sql.update("table", { f1: 2, f2: 'string' });
            assert.strictEqual(query.text, "UPDATE table SET f1='2', f2='string'");
            assert.deepStrictEqual(query.values, [2, 'string']);
        });

        it('single where', function () {
            let query = sql.update("table", { f1: 2, f2: 'string' }).where({ f3: 'asdf' });
            assert.strictEqual(query.text, "UPDATE table SET f1='2', f2='string' WHERE f3 = 'asdf'");
            assert.deepStrictEqual(query.values, [2, 'string', 'asdf']);
        });

        it('Double where', function () {
            let query = sql.update("table", { f1: 2, f2: 'string' }).where({ f3: 'asdf', f4: 'asdf' });
            assert.strictEqual(query.text, "UPDATE table SET f1='2', f2='string' WHERE (f3 = 'asdf' AND f4 = 'asdf')");
            assert.deepStrictEqual(query.values, [2, 'string', 'asdf', 'asdf']);
        });
    });

    describe('delete()', function () {
        it('Simple', function () {
            let query = sql.deletes("table")
            assert.strictEqual(query.text, "DELETE FROM table");
            assert.deepStrictEqual(query.values, []);
        });
        it('with a where', function () {
            let query = sql.deletes("table").where({ id: 3 });
            assert.strictEqual(query.text, "DELETE FROM table WHERE id = $1");
            assert.deepStrictEqual(query.values, [3]);
        });
    });
});
