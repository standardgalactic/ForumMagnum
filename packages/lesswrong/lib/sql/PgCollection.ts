import { MongoCollection, getSqlClient } from "../mongoCollection";
import Table from "./Table";

class PgCollection<T extends DbObject> extends MongoCollection<T> {
  pgTable: Table;

  constructor(tableName: string, options?: { _suppressSameNameError?: boolean }) {
    super(tableName, options);
  }

  buildPostgresTable() {
    this.pgTable = Table.fromCollection(this as unknown as CollectionBase<T>);
  }

  private getSqlClient() {
    const sql = getSqlClient();
    if (!sql) {
      throw new Error("Sql client is not initialized");
    }
    return sql;
  }

  getTable = () => {
    throw new Error("PgCollection: getTable not yet implemented");
  }

  find = (selector?: MongoSelector<T>, options?: MongoFindOptions<T>): FindResult<T> => {
    throw new Error("PgCollection: find not yet implemented");
  }

  findOne = async (selector?: string|MongoSelector<T>, options?: MongoFindOneOptions<T>, projection?: MongoProjection<T>): Promise<T|null> => {
    throw new Error("PgCollection: findOne not yet implemented");
  }

  findOneArbitrary = async (): Promise<T|null> => {
    throw new Error("PgCollection: findOneArbitrary not yet implemented");
  }

  rawInsert = async (doc, options) => {
    throw new Error("PgCollection: rawInsert not yet implemented");
  }

  rawUpdateOne = async (selector, update, options) => {
    throw new Error("PgCollection: rawUpdateOne not yet implemented");
  }

  rawUpdateMany = async (selector, update, options) => {
    throw new Error("PgCollection: rawUpdateMany not yet implemented");
  }

  rawRemove = async (selector, options) => {
    throw new Error("PgCollection: rawRemove not yet implemented");
  }

  _ensureIndex = async (fieldOrSpec, options) => {
    const index = typeof fieldOrSpec === "string" ? [fieldOrSpec] : Object.keys(fieldOrSpec);
    if (!this.pgTable.hasIndex(index)) {
      this.pgTable.addIndex(index);
      const sql = this.getSqlClient();
      const query = this.pgTable.buildCreateIndexSQL(sql, index);
      await query;
    }
  }

  aggregate = (pipeline, options) => {
    throw new Error("PgCollection: aggregate not yet implemented");
  }

  rawCollection = () => ({
    bulkWrite: async (operations, options) => {
      throw new Error("PgCollection: rawCollection.bulkWrite not yet implemented");
    },
    findOneAndUpdate: async (filter, update, options) => {
      throw new Error("PgCollection: rawCollection.findOneAndUpdate not yet implemented");
    },
    dropIndex: async (indexName, options) => {
      throw new Error("PgCollection: rawCollection.dropIndex not yet implemented");
    },
    indexes: async (options) => {
      throw new Error("PgCollection: rawCollection.indexes not yet implemented");
    },
    updateOne: async (selector, update, options) => {
      throw new Error("PgCollection: rawCollection.updateOne not yet implemented");
    },
    updateMany: async (selector, update, options) => {
      throw new Error("PgCollection: rawCollection.updateMany not yet implemented");
    },
  });
}

export default PgCollection;
