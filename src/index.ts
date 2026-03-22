import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { startAllJobs } from "./jobs/index.js";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`🚀 Ball Sort API running on port ${env.PORT}`);


    startAllJobs();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();