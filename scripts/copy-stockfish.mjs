import {
    copyFile,
    mkdir,
} from "node:fs/promises";

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(
    fileURLToPath(import.meta.url),
);

const projectRoot = resolve(
    currentDirectory,
    "..",
);

const sourceDirectory = resolve(
    projectRoot,
    "node_modules",
    "stockfish",
    "bin",
);

const destinationDirectory = resolve(
    projectRoot,
    "public",
    "stockfish",
);

const files = [
    "stockfish-18-lite-single.js",
    "stockfish-18-lite-single.wasm",
];

async function copyStockfishFiles() {
    await mkdir(destinationDirectory, {
        recursive: true,
    });

    for (const fileName of files) {
        const source = resolve(
            sourceDirectory,
            fileName,
        );

        const destination = resolve(
            destinationDirectory,
            fileName,
        );

        await copyFile(source, destination);

        console.log(
            `Stockfish copiado: ${fileName}`,
        );
    }
}

copyStockfishFiles().catch((error) => {
    console.error(
        "No se pudieron copiar los archivos de Stockfish.",
        error,
    );

    process.exitCode = 1;
});