/* eslint-disable no-console */
import { format as sqlFormatter } from 'sql-formatter';
import { Vulcan, getCollection } from "../vulcan-lib";
import { getAllCollections } from "../../lib/vulcan-lib/getCollection";
import Table from "../../lib/sql/Table";
import CreateTableQuery from "../../lib/sql/CreateTableQuery";
import md5 from 'md5';
import { unlink, writeFile } from 'node:fs/promises'
import path from 'path';
import { exec } from 'child_process';
import { acceptMigrations, migrationsPath } from './acceptMigrations';
import { existsSync } from 'node:fs';
import { ForumTypeString } from '../../lib/instanceSettings';
import { postgresFunctions } from '../postgresFunctions';
import { postgresExtensions } from '../postgresExtensions';
import CreateExtensionQuery from '../../lib/sql/CreateExtensionQuery';
import CreateIndexQuery from '../../lib/sql/CreateIndexQuery';
import { sqlInterpolateArgs } from '../../lib/sql/Type';
import { expectedCustomPgIndexes } from '../../lib/collectionIndexUtils';
import { getAllPostgresViews } from '../postgresView';

const ROOT_PATH = path.join(__dirname, "../../../");
const acceptedSchemePath = (rootPath: string) => path.join(rootPath, "schema/accepted_schema.sql");
const schemaToAcceptPath = (rootPath: string) => path.join(rootPath, "schema/schema_to_accept.sql");

const migrationTemplateHeader = `/**
 * Generated on %TIMESTAMP% by \`yarn makemigrations\`
 * The following schema changes were detected:
 * -------------------------------------------
`

const migrationTemplateFooter = `
 * -------------------------------------------
 * (run \`git diff --no-index schema/accepted_schema.sql schema/schema_to_accept.sql\` to see this more clearly)
 *
 * - [ ] Write a migration to represent these changes
 * - [ ] Rename this file to something more readable
 * - [ ] Uncomment \`acceptsSchemaHash\` below
 * - [ ] Run \`yarn acceptmigrations\` to update the accepted schema hash (running makemigrations again will also do this)
 */
// export const acceptsSchemaHash = "%HASH%";

export const up = async ({db}: MigrationContext) => {
  // TODO
}

export const down = async ({db}: MigrationContext) => {
  // TODO, not required
}
`

const schemaFileHeaderTemplate = `-- GENERATED FILE
-- Do not edit this file directly. Instead, start a server and run "yarn makemigrations"
-- as described in the README. This file should nevertheless be checked in to version control.
--
`

const format = (sql: string) => sqlFormatter(sql, {language: "postgresql"});

const generateMigration = async ({
  acceptedSchemaFile, toAcceptSchemaFile, toAcceptHash, rootPath,
}: {
  acceptedSchemaFile: string,
  toAcceptSchemaFile: string,
  toAcceptHash: string,
  rootPath: string,
}) => {
  const execRun = (cmd: string) => {
    return new Promise((resolve) => {
      // git diff exits with an error code if there are differences, ignore that and just always return stdout
      exec(cmd, (_error, stdout, _stderr) => resolve(stdout))
    })
  }

  // bit of a hack but using `git diff` for everything makes the changes easy to read
  const diff: string = await execRun(`git diff --no-index ${acceptedSchemaFile} ${toAcceptSchemaFile} --unified=1`) as string;
  const paddedDiff = diff.replace(/^/gm, ' * ');

  let contents = "";
  contents += migrationTemplateHeader.replace("%TIMESTAMP%", new Date().toISOString());
  contents += paddedDiff.length < 30000 ? paddedDiff : ` * ***Diff too large to display***`;
  contents += migrationTemplateFooter.replace("%HASH%", toAcceptHash);

  const fileTimestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  const fileName = `${fileTimestamp}.auto.ts`;

  await writeFile(path.join(migrationsPath(rootPath), fileName), contents);
}

/**
 * Update the `./schema/` files to match the current database schema, and generate a migration if there are changes which need to be accepted.
 *
 * Implementation details which may be useful to know:
 * This function (and `acceptMigrations`) generates a hash of the current schema (as defined in code) and uses it to maintain three files
 * in the `./schema` directory, `schema_changelog.json`, `accepted_schema.sql`, `schema_to_accept.sql`:
 * - `schema_changelog.json`: This is the file that actually determines whether the current schema is "accepted" or not.
 *   It contains a list of hashes of schema files that have been accepted. If the current schema hash is the most recent entry in this file, then the schema is accepted.
 * - `accepted_schema.sql`: This is a SQL view of the schema that has been accepted.
 * - `schema_to_accept.sql`: If the current schema is not accepted, this file will be generated to contain a SQL view of the "unaccepted" schema.
 *   This is useful for comparing against the accepted schema to see what changes need to be made in the migration that is generated. It is automatically deleted when the schema is accepted.
 */
export const makeMigrations = async ({
  writeSchemaChangelog=true,
  writeAcceptedSchema=true,
  generateMigrations=true,
  rootPath=ROOT_PATH,
  forumType,
  silent=false,
}: {
  /** If true, update the schema_changelog.json file before checking for changes */
  writeSchemaChangelog: boolean,
  /** If true, update the `accepted_schema.sql` and `schema_to_accept.sql` */
  writeAcceptedSchema: boolean,
  /** If true, generate a template migration file if the schema has changed */
  generateMigrations: boolean,
  /** The root path of the project, this is annoying but required because this script is sometimes run from the server bundle, and sometimes from a test. */
  rootPath: string,
  /** The optional forumType to switch to */
  forumType?: ForumTypeString,
  silent?: boolean,
}) => {
  const log = silent ? (..._args: any[]) => {} : console.log;
  log(`=== Checking for schema changes ===`);
  // Get the most recent accepted schema hash from `schema_changelog.json`
  const {acceptsSchemaHash: acceptedHash, acceptedByMigration, timestamp} = await acceptMigrations({write: writeSchemaChangelog, rootPath});
  log(`-- Using accepted hash ${acceptedHash}`);

  const currentHashes: Record<string, string> = {};
  let schemaFileContents = "";

  for (const extensionName of postgresExtensions) {
    const extensionHash = md5(extensionName);
    currentHashes[extensionName] = extensionHash;
    const query = new CreateExtensionQuery(extensionName);
    schemaFileContents += `-- Extension "${extensionName}", hash: ${extensionHash}\n`;
    schemaFileContents += query.compile().sql + ";\n\n";
  }

  // Sort collections by name, so that the order of the output is deterministic
  const collectionNames: CollectionNameString[] = getAllCollections().map(c => c.collectionName).sort();
  let failed: string[] = [];

  for (const collectionName of collectionNames) {
    try {
      const collection = getCollection(collectionName as any);
      if (!collection) {
        throw new Error(`Invalid collection: ${collectionName}`);
      }

      const table = Table.fromCollection(collection, forumType);
      const createTableQuery = new CreateTableQuery(table);
      const compiled = createTableQuery.compile();
      if (compiled.args.length) {
        throw new Error(`Unexpected arguments: ${compiled.args}`);
      }

      const sql = compiled.sql + ";";
      const hash = md5(sql);
      currentHashes[collectionName] = hash;

      // Include the hash of every collection to make it easier to see what changed
      schemaFileContents += `-- Schema for "${collectionName}", hash: ${hash}\n`;
      schemaFileContents += `${format(sql)}`;

      const indexes = table.getIndexes();
      for (const index of indexes) {
        const indexName = index.getName();
        const indexQuery = new CreateIndexQuery(table, index);
        const indexCompiled = indexQuery.compile();
        const indexSql = sqlInterpolateArgs(indexCompiled.sql, indexCompiled.args) + ";";
        const indexHash = md5(indexSql);
        currentHashes[indexName] = indexHash;

        schemaFileContents += `-- Index "${indexName}" ON "${collectionName}", hash: ${indexHash}\n`;
        schemaFileContents += `${format(indexSql)}`;
      }
    } catch (e) {
      console.error(`Failed to check schema for collection ${collectionName}`);
      failed.push(collectionName);
      console.error(e);
    }
  }

  for (const func of postgresFunctions) {
    const hash = md5(func);
    currentHashes[func] = hash;
    schemaFileContents += `-- Function, hash: ${hash}\n`;
    schemaFileContents += func + ";\n\n";
  }

  for (const index of expectedCustomPgIndexes) {
    const trimmed = index.trim().replace(/\s+CONCURRENTLY\s+/gi, " ");
    const hasSemi = trimmed[trimmed.length - 1] === ";";
    const indexHash = md5(trimmed);
    currentHashes[index] = indexHash;
    schemaFileContents += `-- Custom index, hash: ${indexHash}\n`;
    schemaFileContents += format(trimmed + (hasSemi ? "" : ";"));
  }

  for (const view of getAllPostgresViews()) {
    const name = view.getName();
    const query = view.getCreateViewQuery().trim();
    const hasSemi = query[query.length - 1] === ";";
    const hash = md5(query);
    currentHashes[name] = hash;
    schemaFileContents += `-- View "${name}", hash: ${hash}\n`;
    schemaFileContents += format(query + (hasSemi ? "" : ";"));

    for (const index of view.getCreateIndexQueries()) {
      const indexQuery = index.trim();
      const hasSemi = indexQuery[indexQuery.length - 1] === ";";
      const indexHash = md5(indexQuery);
      currentHashes[index] = hash;
      schemaFileContents += `-- Index on view "${name}", hash: ${indexHash}\n`;
      schemaFileContents += format(indexQuery + (hasSemi ? "" : ";"));
    }
  }

  if (failed.length) throw new Error(`Failed to generate schema for ${failed.length} collections: ${failed}`)
  
  const overallHash = md5(Object.values(currentHashes).sort().join());
  let schemaFileHeader = schemaFileHeaderTemplate + `-- Overall schema hash: ${overallHash}\n\n`;
  
  const toAcceptSchemaFile = schemaToAcceptPath(rootPath);
  const acceptedSchemaFile = acceptedSchemePath(rootPath);

  if (overallHash !== acceptedHash) {
    if (writeAcceptedSchema) {
      await writeFile(toAcceptSchemaFile, schemaFileHeader + schemaFileContents);
    }
    if (generateMigrations) {
      await generateMigration({acceptedSchemaFile, toAcceptSchemaFile, toAcceptHash: overallHash, rootPath});
    }
    throw new Error(`Schema has changed, write a migration to accept the new hash: ${overallHash}`);
  }

  if (writeAcceptedSchema) {
    schemaFileHeader += `-- Accepted on ${timestamp}${acceptedByMigration ? " by " + acceptedByMigration : ''}\n\n`;
    await writeFile(acceptedSchemaFile, schemaFileHeader + schemaFileContents);
    if (existsSync(toAcceptSchemaFile)) {
      await unlink(toAcceptSchemaFile);
    }
  }

  log("=== Done ===");
}

Vulcan.makeMigrations = makeMigrations;
