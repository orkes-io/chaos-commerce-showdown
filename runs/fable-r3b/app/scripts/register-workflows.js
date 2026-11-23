// Registers (upserts) the Chaos Commerce workflows on the configured Conductor
// server. Usage: npm run register
import { loadEnvironment, registerWorkflows } from './registration.js';

try {
  const { config, conductor } = loadEnvironment();
  console.log(`Conductor: ${config.conductorUrl}`);
  await registerWorkflows(conductor);
} catch (error) {
  console.error(`Could not register workflows: ${error.message}`);
  process.exit(1);
}
