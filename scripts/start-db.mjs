import EmbeddedPostgres from "embedded-postgres";

const pg = new EmbeddedPostgres({
  databaseDir: "./data/pg",
  user: "scriptify",
  password: "scriptify",
  port: 5432,
  persistent: true,
});

try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("scriptify");
  console.log("PostgreSQL running on port 5432");
  console.log('DATABASE_URL="postgresql://scriptify:scriptify@localhost:5432/scriptify?schema=public"');
  console.log("\nPress Ctrl+C to stop.");
} catch (err) {
  if (err.message?.includes("already") || err.code === "EEXIST") {
    await pg.start();
    console.log("PostgreSQL running on port 5432 (existing data)");
    console.log("\nPress Ctrl+C to stop.");
  } else {
    throw err;
  }
}

process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});
