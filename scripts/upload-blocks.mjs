import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const dir = new URL("../assets/blocks/upload/", import.meta.url);
const idsFile = new URL("../assets/blocks/ids.json", import.meta.url);
const pendingFile = new URL("../build/blocks-upload-receipts.json", import.meta.url);
const temporaryIds = new URL("../assets/blocks/ids.json.tmp", import.meta.url);
const note = "[владелец] ТЗ-03д: ID Studio и SHA-256 исходных PNG Claude.";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const isAssetId = (value) => /^rbxassetid:\/\/[1-9]\d*$/.test(value ?? "");
function readOptional(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return fallback;
  }
}

const files = new Map(readdirSync(dir).filter((name) => name.endsWith(".png")).sort().map((name) => {
  const data = readFileSync(new URL(name, dir));
  return [name, { file: name, sha256: hash(data) }];
}));
const previous = readOptional(idsFile, { assets: {} }).assets;
const changed = [...files.values()].filter(({ file, sha256 }) =>
  previous[file]?.sha256 !== sha256 || !isAssetId(previous[file]?.id));

function record(receipts) {
  const assets = { ...previous };
  for (const { file, sha256, id } of receipts) {
    if (files.get(file)?.sha256 !== sha256 || !isAssetId(id)) {
      throw new Error(`Invalid upload receipt for ${file}`);
    }
    assets[file] = { id, sha256 };
  }
  const sorted = Object.fromEntries([...files.keys()].filter((file) => assets[file]).map((file) => [file, assets[file]]));
  writeFileSync(temporaryIds, JSON.stringify({ _note: note, assets: sorted }, null, 2) + "\n");
  renameSync(temporaryIds, idsFile);
}

async function upload() {
  const key = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
  const userId = process.env.ROBLOX_ASSET_CREATOR_ID;
  if (!key || !/^[1-9]\d*$/.test(userId ?? "")) {
    throw new Error("Set ROBLOX_OPEN_CLOUD_API_KEY and ROBLOX_ASSET_CREATOR_ID, or use plan and record with Studio MCP.");
  }
  async function request(path, body) {
    const url = new URL(path, "https://apis.roblox.com");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await fetch(url, { method: body ? "POST" : "GET", body, headers: { "x-api-key": key } });
      if (res.ok) return res.json();
      if (res.status !== 429 || attempt === 4) throw new Error(`Roblox API ${res.status} for ${path}`);
      await delay(1000 * Math.max(1, Number(res.headers.get("retry-after")) || 2 ** attempt));
    }
  }

  mkdirSync(new URL("../build/", import.meta.url), { recursive: true });
  const journal = readOptional(pendingFile, {});
  for (const item of changed) {
    const { file, sha256 } = item;
    let entry = journal[file];
    if (entry?.sha256 !== sha256) {
      const form = new FormData();
      form.set("request", JSON.stringify({
        assetType: "Image", displayName: "Coco mine " + file.slice(0, -4).replaceAll("_", " "),
        description: "Coco Mining block texture", creationContext: { creator: { userId } },
      }));
      form.set("fileContent", new Blob([readFileSync(new URL(file, dir))], { type: "image/png" }), file);
      const operation = await request("/assets/v1/assets", form);
      if (!operation.operationId) throw new Error(`Missing upload operation for ${file}`);
      entry = journal[file] = { sha256, operationId: operation.operationId };
      writeFileSync(pendingFile, JSON.stringify(journal));
    }
    let operation;
    for (let attempt = 0; attempt < 45; attempt += 1) {
      operation = await request("/assets/v1/operations/" + encodeURIComponent(entry.operationId));
      if (operation.done) break;
      await delay(2000);
    }
    if (!operation?.done || !operation.response?.assetId) {
      throw new Error(`Upload operation incomplete or failed for ${file} (${entry.operationId})`);
    }
    let asset = operation.response;
    for (let attempt = 0; attempt < 45 && asset.moderationResult?.moderationState === "Reviewing"; attempt += 1) {
      await delay(3000);
      asset = await request("/assets/v1/assets/" + asset.assetId);
    }
    if (asset.moderationResult?.moderationState !== "Approved" || asset.state !== "Active") {
      throw new Error(`Roblox has not approved ${file} (asset ${asset.assetId})`);
    }
    const receipt = { ...item, id: "rbxassetid://" + asset.assetId };
    previous[file] = { id: receipt.id, sha256 };
    record([receipt]);
    console.log(file, receipt.id);
  }
  console.log(`${changed.length} uploaded, ${files.size - changed.length} reused`);
}

switch (process.argv[2]) {
  case "plan":
    console.log(JSON.stringify(changed, null, 2));
    break;
  case "record":
    if (!process.argv[3]) throw new Error("Pass a JSON receipt file with {file, sha256, id} entries.");
    record(JSON.parse(readFileSync(process.argv[3], "utf8")));
    break;
  case "upload":
    await upload();
    break;
  default:
    throw new Error("Usage: node scripts/upload-blocks.mjs plan | record receipts.json | upload");
}
