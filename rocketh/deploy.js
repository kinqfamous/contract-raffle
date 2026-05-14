import { setupDeployScripts } from "rocketh";
import { extensions } from "./config.js";
import * as artifacts from "../generated/artifacts/index.js";

const { deployScript } = setupDeployScripts(extensions);

export { deployScript, artifacts };
