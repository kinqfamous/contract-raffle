import fs from "node:fs";
import path from "node:path";

function loadArtifact(relativePath) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing artifact ${relativePath}. Run: npx hardhat compile`);
  }
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

export const VRFCoordinatorV2Mock = loadArtifact(
  "artifacts/contracts/test/VRFcoordinatorV2Mock.sol/VRFCoordinatorV2Mock.json",
);
export const Raffle = loadArtifact("artifacts/contracts/Raffle.sol/Raffle.json");
